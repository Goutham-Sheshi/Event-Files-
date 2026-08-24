import { projectId } from '../utils/supabase/info';
import { supabase } from './lib/supabase';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c0d15c17`;
const FIGMA_CACHE_KEY = 'event-files:figma-resources:v2';
const FIGMA_TOKEN_STATUS_KEY = 'event-files:figma-token-configured:v1';

type FigmaCache = { resources: any[]; lastSyncedAt: string | null };

function readFigmaCache(): FigmaCache {
  try {
    const raw = localStorage.getItem(FIGMA_CACHE_KEY);
    if (!raw) return { resources: [], lastSyncedAt: null };
    const parsed = JSON.parse(raw);
    return {
      resources: Array.isArray(parsed?.resources) ? parsed.resources : [],
      lastSyncedAt: typeof parsed?.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return { resources: [], lastSyncedAt: null };
  }
}

function writeFigmaCache(resources: any[], lastSyncedAt: string | null) {
  try { localStorage.setItem(FIGMA_CACHE_KEY, JSON.stringify({ resources, lastSyncedAt })); } catch {}
}

function setCachedTokenStatus(value: boolean) {
  try { localStorage.setItem(FIGMA_TOKEN_STATUS_KEY, value ? '1' : '0'); } catch {}
}

function getCachedTokenStatus() {
  try { return localStorage.getItem(FIGMA_TOKEN_STATUS_KEY) === '1'; } catch { return false; }
}

async function authHeaders(contentType = false): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  return { Authorization: `Bearer ${session.access_token}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) };
}

export async function setFigmaToken(token: string): Promise<void> {
  const res = await fetch(`${BASE}/figma/token`, { method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ token }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to save token');
  setCachedTokenStatus(true);
}

export async function getFigmaTokenStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/figma/token/status`, { headers: await authHeaders() });
    if (!res.ok) return getCachedTokenStatus();
    const configured = (await res.json()).hasToken === true;
    setCachedTokenStatus(configured);
    return configured;
  } catch {
    // Do not make a transient navigation/network failure look like the token was deleted.
    return getCachedTokenStatus();
  }
}

export type FigmaSyncResult = { resources: any[]; syncedAt: string; pagesScanned: number; pagesLoaded?: number; fileName?: string };

export async function syncFigma(fileKey?: string, tag?: string): Promise<FigmaSyncResult> {
  const res = await fetch(`${BASE}/figma/sync`, { method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ fileKey, tag }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error ?? 'Sync failed';
    const detail = typeof data.detail === 'string' && data.detail ? `: ${data.detail}` : '';
    throw new Error(`${message}${detail}`);
  }
  const resources = Array.isArray(data.resources) ? data.resources : [];
  const syncedAt = typeof data.syncedAt === 'string' ? data.syncedAt : new Date().toISOString();
  // Persist a client-side snapshot as a resilience layer. The server remains the source of truth,
  // but a hard refresh or route remount must not make a completed sync disappear.
  writeFigmaCache(resources, syncedAt);
  setCachedTokenStatus(true);
  return { ...data, resources, syncedAt };
}

function isImageResource(row: any): boolean {
  const format = String(row.file_format || '').toLowerCase().replace(/^\./, '');
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(format)) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i.test(String(row.source_url || ''));
}

export async function getManagedResources(): Promise<any[]> {
  const { data, error } = await supabase.from('vault_resources').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Could not load managed resources:', error.message); return []; }
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    type: row.type === 'document' ? 'other' : row.type,
    productId: row.product_id,
    thumbnail: row.thumbnail || (isImageResource(row) ? row.source_url : undefined),
    sourceUrl: row.source_url,
    fileFormat: row.file_format || undefined,
    fileSize: row.file_size || undefined,
    tags: row.tags || [],
    viewCount: row.view_count || 0,
    downloadCount: row.download_count || 0,
    featured: row.featured || false,
    createdAt: row.created_at,
  }));
}

function normalizeFigmaResources(rows: any[]): any[] {
  return rows
    .filter((row: any) => {
      if (!row || row.type !== 'figma') return false;
      // Accept current SECTION records and legacy/current payload variations. Do not discard a
      // valid persisted Figma record merely because an older server omitted nodeType casing.
      const nodeType = String(row.nodeType ?? row.node_type ?? '').toUpperCase();
      return !nodeType || nodeType === 'SECTION';
    })
    .map((row: any) => ({ ...row, productId: '' }));
}

// Figma Files is isolated from the managed resource catalogue. Server data is authoritative;
// the last successful sync is retained locally so refreshes and route changes remain usable if
// the edge function is temporarily unavailable.
export async function getFigmaResources(): Promise<{ resources: any[]; lastSyncedAt: string | null }> {
  const cached = readFigmaCache();
  try {
    const res = await fetch(`${BASE}/figma/resources`, { headers: await authHeaders() });
    if (!res.ok) return cached;
    const result = await res.json().catch(() => null);
    if (!result || !Array.isArray(result.resources)) return cached;
    const resources = normalizeFigmaResources(result.resources);
    const lastSyncedAt = result.lastSyncedAt ?? cached.lastSyncedAt ?? null;
    writeFigmaCache(resources, lastSyncedAt);
    return { resources, lastSyncedAt };
  } catch {
    return cached;
  }
}
