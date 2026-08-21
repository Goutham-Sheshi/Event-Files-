import { projectId } from '../utils/supabase/info';
import { supabase } from './lib/supabase';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c0d15c17`;

async function authHeaders(contentType = false): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  return {
    Authorization: `Bearer ${session.access_token}`,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function setFigmaToken(token: string): Promise<void> {
  const res = await fetch(`${BASE}/figma/token`, {
    method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to save token');
}

export async function getFigmaTokenStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/figma/token/status`, { headers: await authHeaders() });
    if (!res.ok) return false;
    return (await res.json()).hasToken === true;
  } catch { return false; }
}

export type FigmaSyncResult = { resources: any[]; syncedAt: string; pagesScanned: number };

export async function syncFigma(fileKey?: string, tag?: string): Promise<FigmaSyncResult> {
  const res = await fetch(`${BASE}/figma/sync`, {
    method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ fileKey, tag }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Sync failed');
  return data;
}

function isImageResource(row: any): boolean {
  const format = String(row.file_format || '').toLowerCase().replace(/^\./, '');
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(format)) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i.test(String(row.source_url || ''));
}

/**
 * The main app historically called this only for Figma resources. The same
 * resource collection is also what drives product pages, so managed uploads
 * must be merged here as well. This keeps every uploaded file visible after a
 * normal page refresh, regardless of which product it belongs to.
 */
export async function getFigmaResources(): Promise<{ resources: any[]; lastSyncedAt: string | null }> {
  const figmaRequest = (async () => {
    try {
      const res = await fetch(`${BASE}/figma/resources`, { headers: await authHeaders() });
      if (!res.ok) return { resources: [], lastSyncedAt: null };
      return await res.json();
    } catch {
      return { resources: [], lastSyncedAt: null };
    }
  })();

  const managedRequest = supabase
    .from('vault_resources')
    .select('*')
    .order('created_at', { ascending: false });

  const [figmaResult, managedResult] = await Promise.all([figmaRequest, managedRequest]);

  if (managedResult.error) {
    console.error('Could not load managed resources:', managedResult.error.message);
  }

  const managedResources = (managedResult.data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    // ProductPage currently groups "other" resources but has no dedicated
    // document group. Map uploaded documents there so they are visible now.
    type: row.type === 'document' ? 'other' : row.type,
    productId: row.product_id,
    // Managed uploads usually do not have a separate thumbnail. For images,
    // the uploaded file itself is the thumbnail and uses the same public URL
    // that already powers Open/Download.
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

  const figmaResources = Array.isArray(figmaResult.resources) ? figmaResult.resources : [];
  return {
    resources: [...managedResources, ...figmaResources],
    lastSyncedAt: figmaResult.lastSyncedAt ?? null,
  };
}
