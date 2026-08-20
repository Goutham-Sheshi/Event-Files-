import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.get("/make-server-c0d15c17/health", (c) => c.json({ status: "ok" }));

const BUCKET = "media-catalog-files";
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const DEFAULT_FIGMA_FILE_KEY = "tbDPLtFhYYORMKo4IAKmck";

// ── Catalog / Events (legacy generic KV, kept for compatibility) ──────────────
app.get("/make-server-c0d15c17/catalog", async (c) => {
  const catalog = await kv.get("catalog_v1");
  return c.json({ catalog: catalog ?? null });
});
app.post("/make-server-c0d15c17/catalog", async (c) => {
  const { catalog } = await c.req.json();
  await kv.set("catalog_v1", catalog);
  return c.json({ ok: true });
});
app.get("/make-server-c0d15c17/events", async (c) => {
  const events = await kv.get("events_v1");
  return c.json({ events: events ?? null });
});
app.post("/make-server-c0d15c17/events", async (c) => {
  const { events } = await c.req.json();
  await kv.set("events_v1", events);
  return c.json({ ok: true });
});

// ── Figma integration ──────────────────────────────────────────────────────
// The Figma personal access token is stored server-side only (kv_store), via
// the service-role Supabase client. It is never returned to the client.

app.post("/make-server-c0d15c17/figma/token", async (c) => {
  const { token } = await c.req.json();
  if (!token || typeof token !== "string") return c.json({ error: "Missing token" }, 400);
  await kv.set("figma_token", token);
  return c.json({ ok: true });
});

app.get("/make-server-c0d15c17/figma/token/status", async (c) => {
  const token = await kv.get("figma_token");
  return c.json({ hasToken: !!token });
});

app.get("/make-server-c0d15c17/figma/resources", async (c) => {
  const resources = await kv.get("figma_resources_v1");
  const lastSyncedAt = await kv.get("figma_last_synced_at");
  return c.json({ resources: resources ?? [], lastSyncedAt: lastSyncedAt ?? null });
});

app.post("/make-server-c0d15c17/figma/sync", async (c) => {
  const token = await kv.get("figma_token");
  if (!token) return c.json({ error: "No Figma token configured. Add one first." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const fileKey = body.fileKey || DEFAULT_FIGMA_FILE_KEY;
  const tagPattern = body.tag || "[Final]";

  try {
    // depth=2 → document > pages > top-level frames (enough to find [Final] artboards)
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
      headers: { "X-Figma-Token": token },
    });
    if (!fileRes.ok) {
      const errBody = await fileRes.json().catch(() => ({}));
      return c.json({ error: `Figma API error (${fileRes.status}): ${errBody.err || errBody.message || "request failed"}` }, 502);
    }
    const file = await fileRes.json();

    type Match = { nodeId: string; frameName: string; pageName: string };
    const matches: Match[] = [];
    for (const page of file.document?.children ?? []) {
      for (const node of page.children ?? []) {
        if (node.name?.includes(tagPattern)) {
          matches.push({ nodeId: node.id, frameName: node.name, pageName: page.name });
        }
      }
    }

    let thumbnails: Record<string, string> = {};
    if (matches.length > 0) {
      const ids = matches.map(m => m.nodeId).join(",");
      const imgRes = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`, {
        headers: { "X-Figma-Token": token },
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        thumbnails = imgData.images || {};
      }
    }

    const PRODUCT_NAMES = ["quanta", "catalyx", "consultease", "fr"];
    const resources = matches.map(m => {
      const haystack = `${m.pageName} ${m.frameName}`.toLowerCase();
      const productSlug = PRODUCT_NAMES.find(p => haystack.includes(p));
      return {
        id: `figma-${m.nodeId.replace(/[:;]/g, "-")}`,
        title: m.frameName.replace(tagPattern, "").trim(),
        type: "figma",
        productId: productSlug ? `p-${productSlug}` : "",
        pageName: m.pageName,
        thumbnail: thumbnails[m.nodeId] || undefined,
        sourceUrl: `https://www.figma.com/design/${fileKey}?node-id=${m.nodeId.replace(":", "-")}`,
        tags: ["figma", "final"],
        viewCount: 0,
        downloadCount: 0,
        createdAt: new Date().toISOString(),
      };
    });

    await kv.set("figma_resources_v1", resources);
    const syncedAt = new Date().toISOString();
    await kv.set("figma_last_synced_at", syncedAt);

    return c.json({ resources, syncedAt, pagesScanned: file.document?.children?.length ?? 0 });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// ── Upload (fallback via edge function, service role key) ─────────────────────
app.post("/make-server-c0d15c17/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return c.json({ error: "No file provided" }, 400);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;
  const bytes = await file.arrayBuffer();
  const { error } = await admin().storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return c.json({ error: error.message }, 500);
  const { data: { publicUrl } } = admin().storage.from(BUCKET).getPublicUrl(path);
  const isImage = file.type.startsWith("image/");
  const size = file.size < 1048576 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
  return c.json({ url: publicUrl, thumbnailUrl: isImage ? publicUrl : undefined, name: file.name, size });
});

Deno.serve(app.fetch);
