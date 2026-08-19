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
