import type { Resource, EventItem } from './types';

export function uid(prefix = 'id'): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr).getTime() > Date.now();
}

export function daysRemaining(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function searchResources(resources: Resource[], query: string): Resource[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return resources.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.description?.toLowerCase().includes(q) ||
    r.tags?.some(t => t.toLowerCase().includes(q)) ||
    r.type.toLowerCase().includes(q)
  );
}

export function searchEvents(events: EventItem[], query: string): EventItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return events.filter(e => e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
}

export async function triggerDirectDownload(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    let finalName = filename;
    const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(filename);
    if (!hasExt) {
      try {
        const ext = new URL(url).pathname.split('.').pop();
        if (ext && ext.length <= 5 && !ext.includes('/')) {
          finalName = `${filename}.${ext}`;
        }
      } catch { /* ignore */ }
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();

    // Delay element removal and URL revocation to ensure Chrome/Safari download manager finishes saving the file
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.warn('Direct blob download failed, falling back to new tab:', error);
    window.open(url, '_blank', 'noreferrer');
  }
}

export function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'File');
  } catch {
    return 'File';
  }
}
