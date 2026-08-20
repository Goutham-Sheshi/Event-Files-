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

export async function getFigmaResources(): Promise<{ resources: any[]; lastSyncedAt: string | null }> {
  try {
    const res = await fetch(`${BASE}/figma/resources`, { headers: await authHeaders() });
    if (!res.ok) return { resources: [], lastSyncedAt: null };
    return await res.json();
  } catch { return { resources: [], lastSyncedAt: null }; }
}
