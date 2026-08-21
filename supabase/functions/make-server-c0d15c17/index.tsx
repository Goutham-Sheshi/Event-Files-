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
app.use("*", logger(console.log));
app.use("/*", cors({ origin: APP_ORIGIN, allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], maxAge: 600 }));
const service = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function requireUser(c:any){const auth=c.req.header("Authorization");if(!auth?.startsWith("Bearer "))return null;const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});const {data,error}=await client.auth.getUser();return error||!data.user?null:data.user;}
async function requireAdmin(c:any){const user=await requireUser(c);if(!user)return{user:null,error:c.json({error:"Unauthorized"},401)};const {data,error}=await service().from("user_roles").select("role").eq("user_id",user.id).maybeSingle();if(error||data?.role!=="admin")return{user,error:c.json({error:"Admin access required"},403)};return{user,error:null};}
app.get(`${FUNCTION}/health`,c=>c.json({status:"ok"}));
app.get(`${FUNCTION}/catalog`,async c=>{if(!await requireUser(c))return c.json({error:"Unauthorized"},401);return c.json({catalog:(await kv.get("catalog_v1"))??null});});
app.get(`${FUNCTION}/events`,async c=>{if(!await requireUser(c))return c.json({error:"Unauthorized"},401);return c.json({events:(await kv.get("events_v1"))??null});});
app.get(`${FUNCTION}/figma/resources`,async c=>{if(!await requireUser(c))return c.json({resources:(await kv.get("figma_resources_v1"))??[],lastSyncedAt:(await kv.get("figma_last_synced_at"))??null});});
app.post(`${FUNCTION}/catalog`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const {catalog}=await c.req.json();await kv.set("catalog_v1",catalog);return c.json({ok:true});});
app.post(`${FUNCTION}/events`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const {events}=await c.req.json();await kv.set("events_v1",events);return c.json({ok:true});});
app.post(`${FUNCTION}/figma/token`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const {token}=await c.req.json();if(!token||typeof token!=="string")return c.json({error:"Missing token"},400);await kv.set("figma_token",token.trim());return c.json({ok:true});});
app.get(`${FUNCTION}/figma/token/status`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;return c.json({hasToken:!!(await kv.get("figma_token"))});});
async function figmaFetch(url:string,token:string){return await fetch(url,{headers:{"X-Figma-Token":token}});}
app.post(`${FUNCTION}/figma/sync`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const token=await kv.get("figma_token");if(!token)return c.json({error:"No Figma token configured. Add one first."},400);const body=await c.req.json().catch(()=>({}));const fileKey=String(body.fileKey||DEFAULT_FIGMA_FILE_KEY).trim();const tagPattern=typeof body.tag==="string"?body.tag.trim():"";try{
  // Fetch the document tree only to depth 2: DOCUMENT -> CANVAS(page) -> SECTION.
  // The previous implementation asked Figma for a synthetic root node (0:1), which can
  // return successfully but contains no usable pages for this file, producing an empty sync.
  const url=new URL(`https://api.figma.com/v1/files/${fileKey}`);url.searchParams.set("depth","2");
  const res=await figmaFetch(url.toString(),token);if(!res.ok){const detail=await res.text().catch(()=>"");return c.json({error:`Figma API request failed (${res.status})`,detail:detail.slice(0,500)},502);}const payload=await res.json();const pages=Array.isArray(payload?.document?.children)?payload.document.children:[];const fileName=String(payload?.name||"Figma file");const tagLower=tagPattern.toLowerCase();const matches:{nodeId:string;sectionName:string;pageName:string}[]=[];
  for(const page of pages){const pageName=String(page?.name||"Untitled Page");const sections=Array.isArray(page?.children)?page.children.filter((node:any)=>node?.type==="SECTION"):[];const selected=!tagPattern||pageName.toLowerCase().includes(tagLower)?sections:sections.filter((node:any)=>String(node?.name||"").toLowerCase().includes(tagLower));for(const section of selected)matches.push({nodeId:String(section.id),sectionName:String(section.name||"Untitled Section"),pageName});}
  const syncedAt=new Date().toISOString();const resources=matches.map(match=>({id:`figma-${fileKey}-${match.nodeId.replace(/[:;]/g,"-")}`,nodeId:match.nodeId,nodeType:"SECTION",title:match.sectionName,type:"figma",productId:"",pageName:match.pageName,fileName,fileKey,thumbnail:null,sourceUrl:`https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(match.nodeId)}`,tags:["figma","section",...(tagPattern?[tagPattern.replace(/[\[\]]/g,"").toLowerCase()]:[])],viewCount:0,downloadCount:0,createdAt:syncedAt}));await kv.set("figma_resources_v1",resources);await kv.set("figma_last_synced_at",syncedAt);return c.json({resources,syncedAt,pagesScanned:pages.length,sectionsFound:resources.length,fileName});
}catch(error){console.error("Figma sync failed",error);return c.json({error:"Figma sync failed",detail:error instanceof Error?error.message:String(error)},500)}});
app.post(`${FUNCTION}/upload`,async c=>{const gate=await requireAdmin(c);if(gate.error)return gate.error;const formData=await c.req.formData();const file=formData.get("file") as File|null;if(!file)return c.json({error:"No file provided"},400);const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`${Date.now()}_${crypto.randomUUID()}_${safeName}`;const bytes=await file.arrayBuffer();const {error}=await service().storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false});if(error)return c.json({error:error.message},500);const {data:{publicUrl}}=service().storage.from(BUCKET).getPublicUrl(path);const size=file.size<1048576?`${(file.size/1024).toFixed(0)} KB`:`${(file.size/1048576).toFixed(1)} MB`;return c.json({url:publicUrl,thumbnailUrl:file.type.startsWith("image/")?publicUrl:undefined,name:file.name,size});});
Deno.serve(app.fetch);