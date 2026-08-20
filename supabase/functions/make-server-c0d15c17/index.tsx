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
app.use("/*", cors({
  origin: APP_ORIGIN,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 600,
}));

const service = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function requireUser(c: any) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
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

// Read operations require an authenticated Sheshi Vault user.
app.get(`${FUNCTION}/catalog`, async (c) => {
  if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ catalog: (await kv.get("catalog_v1")) ?? null });
});
app.get(`${FUNCTION}/events`, async (c) => {
  if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ events: (await kv.get("events_v1")) ?? null });
});
app.get(`${FUNCTION}/figma/resources`, async (c) => {
  if (!await requireUser(c)) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ resources: (await kv.get("figma_resources_v1")) ?? [], lastSyncedAt: (await kv.get("figma_last_synced_at")) ?? null });
});

// Every mutation is admin-only. The browser is never trusted to decide this.
app.post(`${FUNCTION}/catalog`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const { catalog } = await c.req.json(); await kv.set("catalog_v1", catalog); return c.json({ ok: true });
});
app.post(`${FUNCTION}/events`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const { events } = await c.req.json(); await kv.set("events_v1", events); return c.json({ ok: true });
});

// Figma token is accepted and stored only on the server, and only from admins.
app.post(`${FUNCTION}/figma/token`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const { token } = await c.req.json();
  if (!token || typeof token !== "string") return c.json({ error: "Missing token" }, 400);
  await kv.set("figma_token", token); return c.json({ ok: true });
});
app.get(`${FUNCTION}/figma/token/status`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  return c.json({ hasToken: !!(await kv.get("figma_token")) });
});

app.post(`${FUNCTION}/figma/sync`, async (c) => {
  const gate = await requireAdmin(c); if (gate.error) return gate.error;
  const token = await kv.get("figma_token");
  if (!token) return c.json({ error: "No Figma token configured. Add one first." }, 400);
  const body = await c.req.json().catch(() => ({}));
  const fileKey = body.fileKey || DEFAULT_FIGMA_FILE_KEY;
  const tagPattern = body.tag || "[Final]";
  try {
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, { headers: { "X-Figma-Token": token } });
    if (!fileRes.ok) return c.json({ error: `Figma API request failed (${fileRes.status})` }, 502);
    const file = await fileRes.json();
    const matches: { nodeId: string; frameName: string; pageName: string }[] = [];
    for (const page of file.document?.children ?? []) for (const node of page.children ?? []) {
      if (node.name?.includes(tagPattern)) matches.push({ nodeId: node.id, frameName: node.name, pageName: page.name });
    }
    let thumbnails: Record<string, string> = {};
    if (matches.length) {
      const ids = matches.map(m => m.nodeId).join(",");
      const imageRes = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`, { headers: { "X-Figma-Token": token } });
      if (imageRes.ok) thumbnails = (await imageRes.json()).images || {};
    }
    const names = ["quanta", "catalyx", "consultease", "fr"];
    const resources = matches.map(m => {
      const product = names.find(p => `${m.pageName} ${m.frameName}`.toLowerCase().includes(p));
      return { id: `figma-${m.nodeId.replace(/[:;]/g, "-")}`, title: m.frameName.replace(tagPattern, "").trim(), type: "figma", productId: product ? `p-${product}` : "", pageName: m.pageName, thumbnail: thumbnails[m.nodeId] || undefined, sourceUrl: `https://www.figma.com/design/${fileKey}?node-id=${m.nodeId.replace(":", "-")}`, tags: ["figma", "final"], viewCount: 0, downloadCount: 0, createdAt: new Date().toISOString() };
    });
    const syncedAt = new Date().toISOString();
    await kv.set("figma_resources_v1", resources); await kv.set("figma_last_synced_at", syncedAt);
    return c.json({ resources, syncedAt, pagesScanned: file.document?.children?.length ?? 0 });
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
