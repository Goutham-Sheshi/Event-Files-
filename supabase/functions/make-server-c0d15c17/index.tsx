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

// Setup: create bucket + RLS policies so anon users can upload/read directly from browser
app.post("/make-server-c0d15c17/setup", async (c) => {
  const sb = admin();
  const { error } = await sb.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 200 * 1024 * 1024 });
  if (error && !error.message.includes("already exists")) return c.json({ error: error.message }, 500);

  // Grant anon read + write on storage bucket via raw SQL through postgrest rpc
  const policies = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='mc_anon_select' AND schemaname='storage' AND tablename='objects') THEN CREATE POLICY "mc_anon_select" ON storage.objects FOR SELECT TO anon USING (bucket_id = '${BUCKET}'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='mc_anon_insert' AND schemaname='storage' AND tablename='objects') THEN CREATE POLICY "mc_anon_insert" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = '${BUCKET}'); END IF; END $$;`,
  ];
  for (const sql of policies) {
    await sb.rpc('exec_sql', { sql }).catch(() => {});
  }

  return c.json({ ok: true });
});

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

// Fallback upload via edge function (service role key) — used if anon policy not yet active
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
