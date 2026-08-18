import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { CatalogData, EventItem } from './data';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c0d15c17`;
const AUTH = { Authorization: `Bearer ${publicAnonKey}` };
const SUPABASE_URL = `https://${projectId}.supabase.co`;
const BUCKET = 'media-catalog-files';

// Direct Supabase client — used for storage uploads (bypasses edge function)
const supabase = createClient(SUPABASE_URL, publicAnonKey);

export async function setupStorage(): Promise<void> {
  try { await fetch(`${BASE}/setup`, { method: 'POST', headers: AUTH }); } catch {}
}

export async function loadCatalog(): Promise<CatalogData | null> {
  try {
    const res = await fetch(`${BASE}/catalog`, { headers: AUTH });
    if (!res.ok) return null;
    return (await res.json()).catalog ?? null;
  } catch { return null; }
}

export async function saveCatalog(catalog: CatalogData): Promise<void> {
  try {
    await fetch(`${BASE}/catalog`, {
      method: 'POST',
      headers: { ...AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalog }),
    });
  } catch {}
}

export async function loadEvents(): Promise<EventItem[] | null> {
  try {
    const res = await fetch(`${BASE}/events`, { headers: AUTH });
    if (!res.ok) return null;
    return (await res.json()).events ?? null;
  } catch { return null; }
}

export async function saveEvents(events: EventItem[]): Promise<void> {
  try {
    await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: { ...AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
  } catch {}
}

export async function fetchOgImage(websiteUrl: string): Promise<string> {
  const res = await fetch(`${BASE}/fetch-og`, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: websiteUrl }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? 'No image found');
  return data.imageUrl as string;
}

export type UploadResult = { url: string; thumbnailUrl?: string; name: string; size: string };

export async function uploadFile(file: File): Promise<UploadResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;

  // Try direct Supabase Storage upload (works once anon policies are set by /setup)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (!error) {
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const isImage = file.type.startsWith('image/');
    const size = file.size < 1048576 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
    return { url: publicUrl, thumbnailUrl: isImage ? publicUrl : undefined, name: file.name, size };
  }

  // Fallback: proxy through edge function (uses service role key, always works once deployed)
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', headers: AUTH, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}
