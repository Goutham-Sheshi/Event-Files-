import type { Product, Resource, EventItem } from './types';

export const products: Product[] = [
  { id: 'p-quanta', name: 'Quanta', slug: 'quanta', color: '#2563eb', light: '#dbeafe',
    description: 'Analytics and reporting platform for enterprise data teams.' },
  { id: 'p-catalyx', name: 'Catalyx', slug: 'catalyx', color: '#7c3aed', light: '#ede9fe',
    description: 'Workflow automation suite connecting sales and operations.' },
  { id: 'p-fr', name: 'FR', slug: 'fr', color: '#e2703a', light: '#fde3d3',
    description: 'Financial reconciliation and reporting toolkit.' },
  { id: 'p-consultease', name: 'Consultease', slug: 'consultease', color: '#15803d', light: '#dcfce7',
    description: 'Client engagement and advisory management platform.' },
];

const IMG = {
  uiHero: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
  uiDash: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
  uiMobile: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900&q=80',
  uiFlow: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=900&q=80',
  logoQuanta: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&q=80',
  logoCatalyx: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
  logoFR: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=600&q=80',
  logoConsultease: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=600&q=80',
  brochure: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80',
  video: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80',
};

let seq = 0;
const id = (prefix: string) => `${prefix}-${(++seq).toString(36)}`;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function productResources(p: Product, imgLogo: string, theme: string): Resource[] {
  return [
    { id: id('r'), title: `${p.name} Primary Logo`, type: 'logo', productId: p.id,
      thumbnail: imgLogo, sourceUrl: imgLogo, fileFormat: 'SVG', tags: ['logo', 'brand'],
      viewCount: 512 + seq * 4, downloadCount: 64, featured: true, createdAt: daysAgo(30) },
    { id: id('r'), title: `${p.name} Logo — White`, type: 'logo', productId: p.id,
      thumbnail: imgLogo, sourceUrl: imgLogo, fileFormat: 'PNG', tags: ['logo', 'brand'],
      viewCount: 180 + seq, downloadCount: 21, createdAt: daysAgo(30) },
    { id: id('r'), title: `${p.name} Icon Only`, type: 'logo', productId: p.id,
      thumbnail: imgLogo, sourceUrl: imgLogo, fileFormat: 'SVG', tags: ['logo', 'icon'],
      viewCount: 96 + seq, downloadCount: 14, createdAt: daysAgo(30) },
    { id: id('r'), title: `${p.name} Product Overview — Q3 2026`, type: 'brochure', productId: p.id,
      thumbnail: IMG.brochure, sourceUrl: '#', fileFormat: 'PDF', fileSize: '4.2 MB', tags: ['sales'],
      viewCount: 145, downloadCount: 39, createdAt: daysAgo(14) },
    { id: id('r'), title: `${theme} Overview`, type: 'video', productId: p.id,
      thumbnail: IMG.video, sourceUrl: 'https://onedrive.live.com', tags: ['demo'],
      viewCount: 402, downloadCount: 0, featured: true, createdAt: daysAgo(5) },
  ];
}

export const resources: Resource[] = [
  ...productResources(products[0], IMG.logoQuanta, 'Quanta Platform Walkthrough'),
  ...productResources(products[1], IMG.logoCatalyx, 'Catalyx Product Demo'),
  ...productResources(products[2], IMG.logoFR, 'FR Highlights Reel'),
  ...productResources(products[3], IMG.logoConsultease, 'Consultease Intro Video'),
];

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
