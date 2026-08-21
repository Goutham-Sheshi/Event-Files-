import { projectId } from '../utils/supabase/info';
import { supabase } from './lib/supabase';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c0d15c17`;

async function authHeaders(contentType = false): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  return { Authorization: `Bearer ${session.access_token}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) };
}

export async function setFigmaToken(token: string): Promise<void> {
  const res = await fetch(`${BASE}/figma/token`, { method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ token }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to save token');
}

export async function getFigmaTokenStatus(): Promise<boolean> {
  try { const res = await fetch(`${BASE}/figma/token/status`, { headers: await authHeaders() }); return res.ok && (await res.json()).hasToken === true; } catch { return false; }
}

export type FigmaSyncResult = { resources: any[]; syncedAt: string; pagesScanned: number; pagesLoaded?: number; fileName?: string };

export async function syncFigma(fileKey?: string, tag?: string): Promise<FigmaSyncResult> {
  const res = await fetch(`${BASE}/figma/sync`, { method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ fileKey, tag }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Sync failed');
  return data;
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

// Figma Files is intentionally isolated from the managed resource catalogue.
// Older vault_resources rows that were previously marked as `figma` are not
// included here, because they can contain stale frame-level data and do not
// belong on the Figma section browser.
export async function getFigmaResources(): Promise<{ resources: any[]; lastSyncedAt: string | null }> {
  try {
    const res = await fetch(`${BASE}/figma/resources`, { headers: await authHeaders() });
    if (!res.ok) return { resources: [], lastSyncedAt: null };
    const result = await res.json();
    const resources = Array.isArray(result.resources)
      ? result.resources
          .filter((row: any) => row?.type === 'figma' && row?.nodeType === 'SECTION')
          .map((row: any) => ({ ...row, productId: '' }))
      : [];
    return { resources, lastSyncedAt: result.lastSyncedAt ?? null };
  } catch {
    return { resources: [], lastSyncedAt: null };
  }
}
