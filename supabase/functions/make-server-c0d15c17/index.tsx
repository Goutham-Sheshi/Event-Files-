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

async function requireUser(c: any) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function requireAdmin(c: any) {
  const user = await requireUser(c);
  if (!user) return { user: null, error: c.json({ error: "Unauthorized" }, 401) };
  const { data, error } = await service().from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (error || data?.role !== "admin") return { user: null, error: c.json({ error: "Admin access required" }, 403) };
  return { user, error: null };
}

app.get(`${FUNCTION}/health`, (c) => c.json({ status: "ok" }));
app.get(`${FUNCTION}/catalog`, async (c) => { if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401); return c.json({ catalog: (await kv.get("catalog_v1")) ?? null }); });
app.get(`${FUNCTION}/events`, async (c) => { if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401); return c.json({ events: (await kv.get("events_v1")) ?? null }); });
app.get(`${FUNCTION}/figma/resources`, async (c) => { if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401); return c.json({ resources: (await kv.get("figma_resources_v1")) ?? [], lastSyncedAt: (await kv.get("figma_last_synced_at")) ?? null }); });

app.post(`${FUNCTION}/catalog`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const { catalog } = await c.req.json(); await kv.set("catalog_v1", catalog); return c.json({ ok: true }); });
app.post(`${FUNCTION}/events`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const { events } = await c.req.json(); await kv.set("events_v1", events); return c.json({ ok: true }); });

app.post(`${FUNCTION}/figma/token`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; const { token } = await c.req.json(); if (!token || typeof token !== "string") return c.json({ error: "Missing token" }, 400); await kv.set("figma_token", token); return c.json({ ok: true }); });
app.get(`${FUNCTION}/figma/token/status`, async (c) => { const gate = await requireAdmin(c); if (gate.error) return gate.error; return c.json({ hasToken: !!(await kv.get("figma_token")) }); });

// Figma hierarchy:
// Figma file -> qualifying page -> every top-level frame on that page.
// A page qualifies when its name contains the configured tag, or when one of its
// top-level frames contains the tag. This supports the existing [Final] marker
// while still loading the complete page rather than only the tagged frame.
app.post(`${FUNCTION}/figma/sync`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const token = await kv.get("figma_token");
  if (!token) return c.json({ error: "No Figma token configured. Add one first." }, 400);
  const body = await c.req.json().catch(() => ({}));
  const fileKey = body.fileKey || DEFAULT_FIGMA_FILE_KEY;
  const tagPattern = String(body.tag || "[Final]");

  try {
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, { headers: { "X-Figma-Token": token } });
    if (!fileRes.ok) return c.json({ error: `Figma API request failed (${fileRes.status})` }, 502);
    const file = await fileRes.json();
    const fileName = file.name || "Untitled Figma file";
    const tagLower = tagPattern.toLowerCase();
    const pages = (file.document?.children ?? []).filter((page: any) => {
      const pageTagged = String(page.name || "").toLowerCase().includes(tagLower);
      const frameTagged = (page.children ?? []).some((node: any) => String(node.name || "").toLowerCase().includes(tagLower));
      return pageTagged || frameTagged;
    });

    const matches = pages.flatMap((page: any) => (page.children ?? [])
      .filter((node: any) => ["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION", "GROUP"].includes(node.type))
      .map((node: any) => ({ nodeId: node.id, frameName: node.name, pageName: page.name })));

    let thumbnails: Record<string, string> = {};
    if (matches.length) {
      const ids = matches.map(m => m.nodeId).join(",");
      const imageRes = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`, { headers: { "X-Figma-Token": token } });
      if (imageRes.ok) thumbnails = (await imageRes.json()).images || {};
    }

    const resources = matches.map(m => ({
      id: `figma-${fileKey}-${m.nodeId.replace(/[:;]/g, "-")}`,
      title: m.frameName.replace(tagPattern, "").trim() || m.frameName,
      type: "figma",
      // Figma content intentionally has no product assignment. It belongs only
      // to the Figma Files hierarchy and must never appear on product pages.
      productId: "",
      pageName: m.pageName,
      fileName,
      fileKey,
      thumbnail: thumbnails[m.nodeId] || undefined,
      sourceUrl: `https://www.figma.com/design/${fileKey}?node-id=${m.nodeId.replace(":", "-")}`,
      tags: ["figma", tagPattern.replace(/[\[\]]/g, "").toLowerCase()],
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    }));

    const syncedAt = new Date().toISOString();
    await kv.set("figma_resources_v1", resources);
    await kv.set("figma_last_synced_at", syncedAt);
    return c.json({ resources, syncedAt, pagesScanned: file.document?.children?.length ?? 0, pagesLoaded: pages.length, fileName });
  } catch (error) { return c.json({ error: "Figma sync failed", detail: String(error) }, 500); }
});

app.post(`${FUNCTION}/upload`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const formData = await c.req.formData(); const file = formData.get("file") as File | null;
  if (!file) return c.json({ error: "No file provided" }, 400);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}_${crypto.randomUUID()}_${safeName}`;
  const bytes = await file.arrayBuffer();
  const { error } = await service().storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return c.json({ error: error.message }, 500);
  const { data: { publicUrl } } = service().storage.from(BUCKET).getPublicUrl(path);
  const size = file.size < 1048576 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
  return c.json({ url: publicUrl, thumbnailUrl: file.type.startsWith("image/") ? publicUrl : undefined, name: file.name, size });
});

Deno.serve(app.fetch);