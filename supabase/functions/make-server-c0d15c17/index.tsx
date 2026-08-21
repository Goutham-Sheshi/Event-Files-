import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const FUNCTION = "/make-server-c0d15c17";
const BUCKET = "media-catalog-files";
const DEFAULT_FIGMA_FILE_KEY = "tbDPLtFhYYORMKo4IAKmck";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://goutham-sheshi.github.io";

app.use('*', logger(console.log));
app.use("/*", cors({ origin: APP_ORIGIN, allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], maxAge: 600 }));

const service = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function requireUser(c: any) { const auth = c.req.header("Authorization"); if (!auth?.startsWith("Bearer ")) return null; const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } }); const { data, error } = await client.auth.getUser(); if (error || !data.user) return null; return data.user; }
async function requireAdmin(c: any) { const user = await requireUser(c); if (!user) return { user: null, error: c.json({ error: "Unauthorized" }, 401) }; const { data, error } = await service().from("user_roles").select("role").eq("user_id", user.id).maybeSingle(); if (error || data?.role !== "admin") return { user, error: c.json({ error: "Admin access required" }, 403) }; return { user, error: null }; }

app.get(`${FUNCTION}/health`, (c) => c.json({ status: "ok" }));
app.get(`${FUNCTION}/catalog`, async (c) => { if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401); return c.json({ catalog: (await kv.get("catalog_v1")) ?? null }); });
app.get(`${FUNCTION}/events`, async (c) => { if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401); return c.json({ events: (await kv.get("events_v1")) ?? null }); });
app.get(`${FUNCTION}/figma/resources`, async (c) => { if (!await requireUser(c)) return c.json({ resources: (await kv.get("figma_resources_v1")) ?? [], lastSyncedAt: (await kv.get("figma_last_synced_at")) ?? null }); });
app.post(`${FUNCTION}/catalog`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const { catalog } = await c.req.json(); await kv.set("catalog_v1", catalog); return c.json({ ok: true }); });
app.post(`${FUNCTION}/events`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const { events } = await c.req.json(); await kv.set("events_v1", events); return c.json({ ok: true }); });
app.post(`${FUNCTION}/figma/token`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const { token } = await c.req.json(); if (!token || typeof token !== "string") return c.json({ error: "Missing token" }, 400); await kv.set("figma_token", token); return c.json({ ok: true }); });
app.get(`${FUNCTION}/figma/token/status`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; return c.json({ hasToken: !!(await kv.get("figma_token")) }); });

type FigmaSectionMatch = { nodeId: string; sectionName: string; pageName: string };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function figmaFetch(url: string, token: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetch(url, { headers: { "X-Figma-Token": token } });
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(300 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchSectionImages(fileKey: string, token: string, ids: string[]) {
  const images: Record<string, string> = {};
  // Keep requests deliberately small. Large image batches were causing the edge
  // fetch to be aborted before the sync response could complete.
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    try {
      const url = new URL(`https://api.figma.com/v1/images/${fileKey}`);
      url.searchParams.set("ids", batch.join(","));
      url.searchParams.set("format", "png");
      url.searchParams.set("scale", "1");
      const response = await figmaFetch(url.toString(), token);
      if (!response.ok) continue;
      const payload = await response.json().catch(() => ({}));
      Object.assign(images, payload.images || {});
    } catch (error) {
      console.error("Figma image batch failed", String(error));
    }
  }
  return images;
}

// FILE -> PAGE -> direct SECTION only. Pages are fetched individually instead
// of downloading the entire Figma document tree, which avoids AbortError on
// large files while still giving us every top-level section.
app.post(`${FUNCTION}/figma/sync`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const token = await kv.get("figma_token");
  if (!token) return c.json({ error: "No Figma token configured. Add one first." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const fileKey = body.fileKey || DEFAULT_FIGMA_FILE_KEY;
  const tagPattern = typeof body.tag === "string" ? body.tag.trim() : "";
  const tagLower = tagPattern.toLowerCase();

  try {
    // depth=1 returns only the file and its page list, not every frame inside it.
    const rootRes = await figmaFetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, token);
    if (!rootRes.ok) {
      const detail = await rootRes.text().catch(() => "");
      return c.json({ error: `Figma API request failed (${rootRes.status})`, detail: detail.slice(0, 500) }, 502);
    }

    const root = await rootRes.json();
    const fileName = root.name || "Untitled Figma file";
    const allPages = Array.isArray(root.document?.children) ? root.document.children : [];
    const matches: FigmaSectionMatch[] = [];
    let pagesLoaded = 0;

    // Load one page at a time with depth=1. This returns the page's direct
    // children only, so frames inside sections are never loaded into the app.
    for (const page of allPages) {
      const pageId = String(page?.id || "");
      if (!pageId) continue;
      try {
        const pageUrl = new URL(`https://api.figma.com/v1/files/${fileKey}/nodes`);
        pageUrl.searchParams.set("ids", pageId);
        pageUrl.searchParams.set("depth", "1");
        const pageRes = await figmaFetch(pageUrl.toString(), token);
        if (!pageRes.ok) { console.error("Figma page fetch failed", pageId, pageRes.status); continue; }
        const pagePayload = await pageRes.json().catch(() => ({}));
        const pageDocument = pagePayload?.nodes?.[pageId]?.document;
        const pageName = String(pageDocument?.name || page.name || "Untitled Page");
        const directSections = Array.isArray(pageDocument?.children)
          ? pageDocument.children.filter((node: any) => node?.type === "SECTION")
          : [];
        const pageMatchesTag = !tagPattern || pageName.toLowerCase().includes(tagLower);
        const selected = pageMatchesTag
          ? directSections
          : directSections.filter((node: any) => String(node.name || "").toLowerCase().includes(tagLower));
        if (selected.length > 0) pagesLoaded++;
        for (const node of selected) {
          matches.push({ nodeId: String(node.id), sectionName: String(node.name || "Untitled Section"), pageName });
        }
      } catch (error) {
        console.error("Figma page aborted or failed", pageId, String(error));
      }
    }

    const thumbnails = await fetchSectionImages(fileKey, token, matches.map(match => match.nodeId));
    const syncedAt = new Date().toISOString();
    const resources = matches.map(match => ({
      id: `figma-${fileKey}-${match.nodeId.replace(/[:;]/g, "-")}`,
      nodeId: match.nodeId,
      nodeType: "SECTION",
      title: tagPattern ? (match.sectionName.replace(tagPattern, "").trim() || match.sectionName) : match.sectionName,
      type: "figma",
      productId: "",
      pageName: match.pageName,
      fileName,
      fileKey,
      thumbnail: thumbnails[match.nodeId] || null,
      sourceUrl: `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(match.nodeId)}`,
      tags: ["figma", "section", ...(tagPattern ? [tagPattern.replace(/[\[\]]/g, "").toLowerCase()] : [])],
      viewCount: 0,
      downloadCount: 0,
      createdAt: syncedAt,
    }));

    await kv.set("figma_resources_v1", resources);
    await kv.set("figma_last_synced_at", syncedAt);
    return c.json({ resources, syncedAt, pagesScanned: allPages.length, pagesLoaded, fileName });
  } catch (error) {
    console.error("Figma sync failed", error);
    return c.json({ error: "Figma sync failed", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post(`${FUNCTION}/upload`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const formData = await c.req.formData(); const file = formData.get("file") as File | null; if (!file) return c.json({ error: "No file provided" }, 400); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const path = `${Date.now()}_${crypto.randomUUID()}_${safeName}`; const bytes = await file.arrayBuffer(); const { error } = await service().storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false }); if (error) return c.json({ error: error.message }, 500); const { data: { publicUrl } } = service().storage.from(BUCKET).getPublicUrl(path); const size = file.size < 1048576 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1048576).toFixed(1)} MB`; return c.json({ url: publicUrl, thumbnailUrl: file.type.startsWith("image/") ? publicUrl : undefined, name: file.name, size }); });

Deno.serve(app.fetch);
