import type { Product, Resource, EventItem } from './types';

export const products: Product[] = [
  { id: 'p-quanta', name: 'Quanta', slug: 'quanta', color: '#60a5fa', light: '#1d2d44',
    description: 'Analytics and reporting platform for enterprise data teams.' },
  { id: 'p-catalyx', name: 'Catalyx', slug: 'catalyx', color: '#c084fc', light: '#2e1f47',
    description: 'Workflow automation suite connecting sales and operations.' },
  { id: 'p-fr', name: 'FR', slug: 'fr', color: '#fb923c', light: '#3a2214',
    description: 'Financial reconciliation and reporting toolkit.' },
  { id: 'p-consultease', name: 'Consultease', slug: 'consultease', color: '#4ade80', light: '#1b3224',
    description: 'Client engagement and advisory management platform.' },
];

const IMG = {
  uiHero: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
  uiFlow: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=900&q=80',
};

let seq = 0;
const id = (prefix: string) => `${prefix}-${(++seq).toString(36)}`;

// No sample resources are seeded. Product pages should only display real files
// added through the admin/upload flow (plus any resources returned by integrations).
export const resources: Resource[] = [];

// Existing sample events are kept separate from resources so removing placeholder
// files does not alter the event experience.
export const events: EventItem[] = [
  { id: id('e'), title: 'Sheshi Partner Summit 2026', description: 'Annual gathering for channel partners and enterprise clients.',
    date: new Date(Date.now() + 12 * 86400000).toISOString(), location: 'Bengaluru · In-person',
    banner: IMG.uiFlow },
  { id: id('e'), title: 'Quanta Product Launch', description: 'Public launch of the redesigned analytics dashboard.',
    date: new Date(Date.now() + 26 * 86400000).toISOString(), location: 'Virtual',
    productId: 'p-quanta', banner: IMG.uiHero },
  { id: id('e'), title: 'Catalyx Roadshow — Mumbai', description: 'Regional roadshow for the automation suite.',
    date: new Date(Date.now() + 40 * 86400000).toISOString(), location: 'Mumbai · In-person',
    productId: 'p-catalyx' },
  { id: id('e'), title: 'FR Quarterly Client Briefing', description: 'Reconciliation toolkit roadmap briefing for clients.',
    date: new Date(Date.now() - 10 * 86400000).toISOString(), location: 'Virtual',
    productId: 'p-fr' },
];
