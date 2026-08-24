import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const FUNCTION = "/make-server-c0d15c17";
const BUCKET = "media-catalog-files";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://goutham-sheshi.github.io";
app.use("*", logger(console.log));
app.use("/*", cors({ origin: APP_ORIGIN, allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], maxAge: 600 }));
const service = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function requireUser(c:any){const auth=c.req.header("Authorization");if(!auth?.startsWith("Bearer "))return null;const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});const {data,error}=await client.auth.getUser();return error||!data.user?null:data.user;}
async function requireAdmin(c:any){const user=await requireUser(c);if(!user)return{user:null,error:c.json({error:"Unauthorized"},401)};const {data,error}=await service().from("user_roles").select("role").eq("user_id",user.id).maybeSingle();if(error||data?.role!=="admin")return{user,error:c.json({error:"Admin access required"},403)};return{user,error:null};}
app.get(`${FUNCTION}/health`,c=>c.json({status:"ok"}));
app.get(`${FUNCTION}/catalog`,async c=>{if(!await requireUser(c))return c.json({error:"Unauthorized"},401);return c.json({catalog:(await kv.get("catalog_v1"))??null});});
app.get(`${FUNCTION}/events`,async c=>{if(!await requireUser(c))return c.json({error:"Unauthorized"},401);return c.json({events:(await kv.get("events_v1"))??null});});
app.post(`${FUNCTION}/catalog`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const {catalog}=await c.req.json();await kv.set("catalog_v1",catalog);return c.json({ok:true});});
app.post(`${FUNCTION}/events`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const {events}=await c.req.json();await kv.set("events_v1",events);return c.json({ok:true});});
app.post(`${FUNCTION}/upload`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const formData=await c.req.formData();const file=formData.get("file") as File|null;if(!file)return c.json({error:"No file provided"},400);const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`${Date.now()}_${crypto.randomUUID()}_${safeName}`;const bytes=await file.arrayBuffer();const {error}=await service().storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false});if(error)return c.json({error:error.message},500);const {data:{publicUrl}}=service().storage.from(BUCKET).getPublicUrl(path);const size=file.size<1048576?`${(file.size/1024).toFixed(0)} KB`:`${(file.size/1048576).toFixed(1)} MB`;return c.json({url:publicUrl,thumbnailUrl:file.type.startsWith("image/")?publicUrl:undefined,name:file.name,size});});
Deno.serve(app.fetch);
