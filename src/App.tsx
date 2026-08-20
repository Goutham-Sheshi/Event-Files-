import React, { useState, useMemo, useEffect } from 'react';
import { products, resources as seedResources, events as seedEvents } from './data';
import { getFigmaResources, getFigmaTokenStatus, setFigmaToken, syncFigma } from './api';
import type { Product, Resource, ResourceType, EventItem } from './types';
import { formatDate, isUpcoming, daysRemaining, searchResources, searchEvents } from './utils';

// ─── Icons ───────────────────────────────────────────────────────────────────
const ic = "none";
const I = ({ children, sz = 17 }: { children: React.ReactNode; sz?: number }) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill={ic} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const HomeIco = () => <I><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></I>;
const GridIco = () => <I><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>;
const FigmaIco = () => <I sz={16}><path d="M8 24a4 4 0 0 0 4-4v-4H8a4 4 0 1 0 0 8Z" /><path d="M4 12a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4Z" /><path d="M4 4a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4Z" /><path d="M12 0h4a4 4 0 1 1 0 8h-4V0Z" /><circle cx="16" cy="12" r="4" /></I>;
const ImageIco = () => <I><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></I>;
const FileTextIco = () => <I><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /></I>;
const PlayIco = () => <I sz={13}><polygon points="6 3 20 12 6 21 6 3" /></I>;
const CalIco = () => <I><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></I>;
const DownloadIco = () => <I sz={14}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></I>;
const ShieldIco = () => <I><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></I>;
const SearchIco = () => <I><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></I>;
const ChevronIco = ({ open }: { open?: boolean }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><polyline points="9 18 15 12 9 6" /></svg>;
const XIco = () => <I sz={15}><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></I>;
const ExtIco = () => <I sz={11}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></I>;
const PanelIco = () => <I sz={16}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" x2="9" y1="3" y2="21" /></I>;
const StarIco = () => <I sz={12}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></I>;

// ─── View state (client-side "routing") ─────────────────────────────────────
type View =
  | { kind: 'home' }
  | { kind: 'product'; slug: string }
  | { kind: 'section'; section: ResourceType | 'all' }
  | { kind: 'events' }
  | { kind: 'admin' };

const NAV_ITEMS: { key: string; label: string; icon: React.ReactNode; view: View }[] = [
  { key: 'home', label: 'Home', icon: <HomeIco />, view: { kind: 'home' } },
  { key: 'figma', label: 'Figma Files', icon: <FigmaIco />, view: { kind: 'section', section: 'figma' } },
  { key: 'assets', label: 'Brand Assets', icon: <ImageIco />, view: { kind: 'section', section: 'logo' } },
  { key: 'brochures', label: 'Brochures', icon: <FileTextIco />, view: { kind: 'section', section: 'brochure' } },
  { key: 'videos', label: 'Videos', icon: <PlayIco />, view: { kind: 'section', section: 'video' } },
  { key: 'events', label: 'Events', icon: <CalIco />, view: { kind: 'events' } },
  { key: 'resources', label: 'All Resources', icon: <DownloadIco />, view: { kind: 'section', section: 'all' } },
];

const SECTION_LABEL: Record<ResourceType | 'all', string> = {
  all: 'All Resources', figma: 'Figma Files', logo: 'Brand Assets', brochure: 'Brochures',
  video: 'Videos', document: 'Documents', other: 'Other Resources',
};

function productOf(id: string): Product | undefined { return products.find(p => p.id === id); }

// ─── Shared bits ─────────────────────────────────────────────────────────────

const ProductBadge = ({ product, sz = 'md' }: { product?: Product; sz?: 'sm' | 'md' }) => {
  if (!product) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sz === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
      style={{ background: product.light, color: product.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: product.color }} />
      {product.name}
    </span>
  );
};

const TypeIcon = ({ type }: { type: ResourceType }) => {
  const map: Record<ResourceType, React.ReactNode> = {
    figma: <FigmaIco />, logo: <ImageIco />, brochure: <FileTextIco />, video: <PlayIco />, document: <FileTextIco />, other: <FileTextIco />,
  };
  return <div className="w-9 h-9 rounded-lg bg-[var(--canvas-deep)] flex items-center justify-center text-[var(--ink-45)]">{map[type]}</div>;
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--ink-45)]">
    <div className="w-12 h-12 rounded-full bg-[var(--canvas-deep)] flex items-center justify-center mb-3"><SearchIco /></div>
    <div className="text-[13px]">{label}</div>
  </div>
);

// ─── Resource Card (adapts preview treatment per type) ───────────────────────

const ResourceCard = ({ resource }: { resource: Resource }) => {
  const product = productOf(resource.productId);
  const isLogo = resource.type === 'logo';
  const isBrochure = resource.type === 'brochure';
  const isVideo = resource.type === 'video';
  const ctaLabel = resource.type === 'figma' ? 'Open in Figma' : resource.type === 'video' ? 'Open Video' : 'Download';

  return (
    <div className="group bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className={`relative overflow-hidden bg-[var(--canvas-deep)] flex items-center justify-center ${
        isLogo ? 'h-[120px] p-6' : isBrochure ? 'h-[170px]' : 'h-[140px]'
      }`}>
        {resource.thumbnail ? (
          <img src={resource.thumbnail} alt={resource.title}
            className={isLogo ? 'max-h-full max-w-full object-contain' : 'w-full h-full object-cover'} loading="lazy" />
        ) : <TypeIcon type={resource.type} />}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[var(--ink)] pl-0.5"><PlayIco /></div>
          </div>
        )}
        {resource.featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-[var(--ink)] text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm">
            <StarIco /> Featured
          </span>
        )}
        {resource.fileFormat && (
          <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm text-[var(--ink-70)] font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm">{resource.fileFormat}</span>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[13px] font-medium text-[var(--ink)] leading-snug line-clamp-2">{resource.title}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProductBadge product={product} sz="sm" />
          {resource.fileSize && <span className="font-mono text-[10px] text-[var(--ink-45)]">{resource.fileSize}</span>}
        </div>
        <div className="mt-auto pt-1 flex items-center justify-between">
          <span className="text-[10px] text-[var(--ink-45)]">{resource.viewCount} views</span>
          <a href={resource.sourceUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink)] hover:text-[#e2703a] transition-colors">
            {ctaLabel} {resource.type === 'figma' || resource.type === 'video' ? <ExtIco /> : <DownloadIco />}
          </a>
        </div>
      </div>
    </div>
  );
};

const ResourceGrid = ({ items }: { items: Resource[] }) => (
  items.length === 0 ? <EmptyState label="No resources here yet." /> : (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map(r => <ResourceCard key={r.id} resource={r} />)}
    </div>
  )
);

// ─── Events ──────────────────────────────────────────────────────────────────

const EventCard = ({ event, featured }: { event: EventItem; featured?: boolean }) => {
  const product = event.productId ? productOf(event.productId) : undefined;
  const upcoming = isUpcoming(event.date);
  const remaining = daysRemaining(event.date);

  if (featured) {
    return (
      <div className="relative rounded-2xl overflow-hidden text-white" style={{ minHeight: 220 }}>
        {event.banner ? (
          <img src={event.banner} className="absolute inset-0 w-full h-full object-cover" alt="" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${product?.color ?? '#1a1d21'}, #1a1d21)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
        <div className="relative z-10 flex flex-col justify-between h-full p-6" style={{ minHeight: 220 }}>
          <div className="flex items-center gap-2">
            {product && <ProductBadge product={product} sz="sm" />}
            <span className="inline-flex items-center bg-[#e2703a] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
              {remaining > 0 ? `${remaining} DAYS LEFT` : 'TODAY'}
            </span>
          </div>
          <div>
            <h3 className="font-display text-[22px] font-bold leading-tight mb-1">{event.title}</h3>
            <p className="text-white/70 text-[12px]">{formatDate(event.date)} {event.location ? `· ${event.location}` : ''}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        {product ? <ProductBadge product={product} sz="sm" /> : <span className="text-[10px] font-mono text-[var(--ink-45)] uppercase tracking-wide">General</span>}
        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${upcoming ? 'bg-[var(--canvas-deep)] text-[var(--ink-70)]' : 'bg-[var(--canvas-deep)] text-[var(--ink-45)]'}`}>
          {upcoming ? `${remaining}d` : 'Past'}
        </span>
      </div>
      <div className="text-[14px] font-semibold text-[var(--ink)] leading-snug mb-1">{event.title}</div>
      <div className="text-[11px] text-[var(--ink-45)]">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
    </div>
  );
};

// ─── Home dashboard ──────────────────────────────────────────────────────────

const HomeView = ({ resources, onSelectProduct }: { resources: Resource[]; onSelectProduct: (slug: string) => void }) => {
  const upcoming = [...seedEvents].filter(e => isUpcoming(e.date)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const featured = upcoming[0];
  const rest = upcoming.slice(1);
  const latest = [...resources].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const popular = [...resources].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const quick = [
    { label: 'Latest Brand Guidelines', sub: 'Brochures', section: 'brochure' as const },
    { label: 'Product Logos', sub: 'Brand Assets', section: 'logo' as const },
    { label: 'Featured Figma Files', sub: 'Figma Files', section: 'figma' as const },
    { label: 'All Videos', sub: 'Videos', section: 'video' as const },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 flex flex-col gap-9 max-w-[1400px]">
        <div>
          <div className="font-mono text-[11px] text-[var(--ink-45)] uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="font-display text-[26px] font-bold text-[var(--ink)] tracking-tight">Welcome back</h1>
        </div>

        {/* Upcoming events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-[15px] font-bold text-[var(--ink)]">Upcoming Events</h2>
          </div>
          {featured ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><EventCard event={featured} featured /></div>
              <div className="flex flex-col gap-3">
                {rest.slice(0, 2).map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          ) : <EmptyState label="No upcoming events." />}
        </div>

        {/* Quick access */}
        <div>
          <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quick.map(q => (
              <button key={q.label} className="text-left bg-white border border-[var(--line-soft)] rounded-xl px-4 py-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="text-[13px] font-semibold text-[var(--ink)]">{q.label}</div>
                <div className="text-[11px] text-[var(--ink-45)] mt-0.5">{q.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {products.map(p => {
              const count = resources.filter(r => r.productId === p.id).length;
              return (
                <button key={p.id} onClick={() => onSelectProduct(p.slug)}
                  className="text-left rounded-xl px-4 py-3.5 border border-[var(--line-soft)] hover:border-transparent transition-all"
                  style={{ background: `linear-gradient(135deg, ${p.color}10, ${p.color}1c)` }}>
                  <div className="w-7 h-7 rounded-lg mb-2.5 flex items-center justify-center text-[11px] font-bold font-display" style={{ background: p.light, color: p.color }}>
                    {p.name[0]}
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--ink)]">{p.name}</div>
                  <div className="text-[11px] text-[var(--ink-45)] mt-0.5">{count} resources</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Latest resources */}
        <div>
          <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Latest Resources</h2>
          <ResourceGrid items={latest} />
        </div>

        {/* Popular resources */}
        <div className="pb-8">
          <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Popular Resources</h2>
          <ResourceGrid items={popular} />
        </div>
      </div>
    </div>
  );
};

// ─── Product page ────────────────────────────────────────────────────────────

const ProductPage = ({ product, resources }: { product: Product; resources: Resource[] }) => {
  const items = resources.filter(r => r.productId === product.id);
  const groups: { type: ResourceType; label: string }[] = [
    { type: 'figma', label: 'Figma Designs' }, { type: 'logo', label: 'Logos' },
    { type: 'brochure', label: 'Brochures' }, { type: 'video', label: 'Videos' },
    { type: 'other', label: 'Other Resources' },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--line-soft)]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-[22px] font-bold flex-shrink-0"
            style={{ background: product.light, color: product.color }}>{product.name[0]}</div>
          <div>
            <h1 className="font-display text-[24px] font-bold text-[var(--ink)] tracking-tight">{product.name}</h1>
            <p className="text-[13px] text-[var(--ink-45)] mt-0.5">{product.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-9 pb-8">
          {groups.map(g => {
            const groupItems = items.filter(r => r.type === g.type);
            if (groupItems.length === 0) return null;
            return (
              <div key={g.type}>
                <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">{g.label}</h2>
                <ResourceGrid items={groupItems} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Figma sync panel (token entry + manual sync trigger) ───────────────────

const FigmaSyncPanel = ({
  hasToken, lastSyncedAt, onTokenSaved, onSynced,
}: {
  hasToken: boolean; lastSyncedAt: string | null;
  onTokenSaved: () => void; onSynced: (resources: Resource[]) => void;
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(!hasToken);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setSaving(true); setError(null);
    try {
      await setFigmaToken(tokenInput.trim());
      setTokenInput('');
      setShowInput(false);
      onTokenSaved();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  };

  const handleSync = async () => {
    setSyncing(true); setError(null);
    try {
      const result = await syncFigma();
      onSynced(result.resources as Resource[]);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSyncing(false);
  };

  return (
    <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 mb-5 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasToken ? 'bg-green-500' : 'bg-[var(--ink-45)]'}`} />
          <span className="text-[12.5px] text-[var(--ink-70)]">{hasToken ? 'Figma token configured' : 'No Figma token set'}</span>
          {lastSyncedAt && <span className="text-[11px] text-[var(--ink-45)]">· Last synced {new Date(lastSyncedAt).toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInput(s => !s)} className="text-[12px] font-medium text-[var(--ink-70)] hover:text-[var(--ink)]">
            {hasToken ? 'Update token' : 'Set token'}
          </button>
          <button onClick={handleSync} disabled={!hasToken || syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink)] text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition-colors">
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>
      {showInput && (
        <div className="flex items-center gap-2 flex-wrap">
          <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)}
            placeholder="figd_… personal access token"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-[var(--line-soft)] text-[13px] outline-none focus:border-[var(--ink-45)]" />
          <button onClick={handleSaveToken} disabled={saving || !tokenInput.trim()}
            className="px-3 py-2 rounded-lg bg-[var(--canvas-deep)] text-[var(--ink)] text-[12px] font-semibold disabled:opacity-40">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
      {error && <div className="text-[12px] text-red-600">{error}</div>}
      <div className="text-[11px] text-[var(--ink-45)] leading-relaxed">
        Token is stored server-side and never sent back to the browser. Regenerate a Figma personal access token any time (e.g. every 30 days) and paste it here to keep syncing.
      </div>
    </div>
  );
};

// ─── Section page (Figma Files / Brand Assets / Brochures / Videos / All) ───

const SectionPage = ({
  section, resources, figmaMeta,
}: {
  section: ResourceType | 'all'; resources: Resource[];
  figmaMeta?: { hasToken: boolean; lastSyncedAt: string | null; onTokenSaved: () => void; onSynced: (resources: Resource[]) => void };
}) => {
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const base = section === 'all' ? resources : resources.filter(r => r.type === section);
  const items = productFilter ? base.filter(r => r.productId === productFilter) : base;
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">{SECTION_LABEL[section]}</h1>
        </div>
        {section === 'figma' && figmaMeta && (
          <FigmaSyncPanel hasToken={figmaMeta.hasToken} lastSyncedAt={figmaMeta.lastSyncedAt}
            onTokenSaved={figmaMeta.onTokenSaved} onSynced={figmaMeta.onSynced} />
        )}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={() => setProductFilter(null)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${!productFilter ? 'bg-[var(--ink)] text-white' : 'bg-[var(--canvas-deep)] text-[var(--ink-70)] hover:bg-[var(--line-soft)]'}`}>
            All Products
          </button>
          {products.map(p => (
            <button key={p.id} onClick={() => setProductFilter(p.id)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${productFilter === p.id ? 'text-white' : 'bg-[var(--canvas-deep)] text-[var(--ink-70)] hover:bg-[var(--line-soft)]'}`}
              style={productFilter === p.id ? { background: p.color } : undefined}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="pb-8"><ResourceGrid items={items} /></div>
      </div>
    </div>
  );
};

const EventsPage = () => {
  const sorted = [...seedEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter(e => isUpcoming(e.date));
  const past = sorted.filter(e => !isUpcoming(e.date)).reverse();
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-[1400px] flex flex-col gap-8 pb-8">
        <h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">Events</h1>
        <div>
          <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Upcoming</h2>
          {upcoming.length === 0 ? <EmptyState label="No upcoming events." /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
        {past.length > 0 && (
          <div>
            <h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Past</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
              {past.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPlaceholder = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center max-w-sm">
      <div className="w-12 h-12 rounded-full bg-[var(--canvas-deep)] flex items-center justify-center mx-auto mb-3 text-[var(--ink-45)]"><ShieldIco /></div>
      <div className="font-display text-[16px] font-bold text-[var(--ink)] mb-1.5">Admin Console</div>
      <div className="text-[13px] text-[var(--ink-45)] leading-relaxed">
        User management, resource management, and event editing land here in the next phase — this pass covers navigation and browsing.
      </div>
    </div>
  </div>
);

// ─── Search overlay ──────────────────────────────────────────────────────────

const SearchOverlay = ({ resources, onClose }: { resources: Resource[]; onClose: () => void }) => {
  const [q, setQ] = useState('');
  const resultResources = useMemo(() => searchResources(resources, q), [q, resources]);
  const resultEvents = useMemo(() => searchEvents(seedEvents, q), [q]);
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line-soft)]">
          <SearchIco />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search resources, events, tags…"
            className="flex-1 outline-none text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-45)]" />
          <button onClick={onClose} className="text-[var(--ink-45)] hover:text-[var(--ink)]"><XIco /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {q.trim() === '' ? (
            <div className="text-center text-[13px] text-[var(--ink-45)] py-10">Start typing to search…</div>
          ) : resultResources.length === 0 && resultEvents.length === 0 ? (
            <EmptyState label={`No results for "${q}"`} />
          ) : (
            <>
              {resultEvents.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--canvas)]">
                  <div className="w-8 h-8 rounded-md bg-[var(--canvas-deep)] flex items-center justify-center text-[var(--ink-45)] flex-shrink-0"><CalIco /></div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--ink)] truncate">{e.title}</div>
                    <div className="text-[11px] text-[var(--ink-45)]">{formatDate(e.date)}</div>
                  </div>
                </div>
              ))}
              {resultResources.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--canvas)]">
                  <div className="w-8 h-8 rounded-md bg-[var(--canvas-deep)] flex items-center justify-center text-[var(--ink-45)] flex-shrink-0"><TypeIcon type={r.type} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--ink)] truncate">{r.title}</div>
                    <div className="text-[11px] text-[var(--ink-45)] capitalize">{r.type}</div>
                  </div>
                  <ProductBadge product={productOf(r.productId)} sz="sm" />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const Sidebar = ({
  view, collapsed, onToggleCollapse, onSelect, onSelectProduct, productsOpen, onToggleProducts,
}: {
  view: View; collapsed: boolean; onToggleCollapse: () => void; onSelect: (v: View) => void;
  onSelectProduct: (slug: string) => void; productsOpen: boolean; onToggleProducts: () => void;
}) => {
  const activeKey = view.kind === 'home' ? 'home'
    : view.kind === 'events' ? 'events'
    : view.kind === 'admin' ? 'admin'
    : view.kind === 'section' ? (view.section === 'all' ? 'resources' : { figma: 'figma', logo: 'assets', brochure: 'brochures', video: 'videos', document: 'resources', other: 'resources' }[view.section])
    : null;

  const NavBtn = ({ active, icon, label, onClick, badge }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) => (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors ${collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'} ${
        active ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-70)] hover:bg-[var(--canvas-deep)]'
      }`}>
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-[#e2703a] text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">{badge}</span>
      )}
    </button>
  );

  return (
    <aside className={`flex-shrink-0 flex flex-col bg-white border-r border-[var(--line)] overflow-hidden transition-all duration-200 ${collapsed ? 'w-[64px]' : 'w-[236px]'}`}>
      <div className={`h-14 flex items-center border-b border-[var(--line-soft)] flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2a2f36, var(--ink))' }}>
              <span className="text-white font-display font-bold text-[13px]">B</span>
            </div>
            <span className="font-display text-[15px] font-bold text-[var(--ink)] tracking-tight">BrandHub</span>
          </div>
        )}
        <button onClick={onToggleCollapse} className="text-[var(--ink-45)] hover:text-[var(--ink)] p-1 rounded-md hover:bg-[var(--canvas-deep)]"><PanelIco /></button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-0.5">
        <NavBtn active={activeKey === 'home'} icon={<HomeIco />} label="Home" onClick={() => onSelect({ kind: 'home' })} />

        <div>
          <button onClick={onToggleProducts} title={collapsed ? 'Products' : undefined}
            className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors text-[var(--ink-70)] hover:bg-[var(--canvas-deep)] ${collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'}`}>
            <span className="flex-shrink-0"><GridIco /></span>
            {!collapsed && <><span className="flex-1 text-left">Products</span><ChevronIco open={productsOpen} /></>}
          </button>
          {!collapsed && productsOpen && (
            <div className="ml-3 pl-3 border-l border-[var(--line-soft)] flex flex-col gap-0.5 mt-0.5 mb-1">
              {products.map(p => {
                const active = view.kind === 'product' && view.slug === p.slug;
                return (
                  <button key={p.id} onClick={() => onSelectProduct(p.slug)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] text-left transition-colors ${active ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-45)] hover:text-[var(--ink)]'}`}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <NavBtn active={activeKey === 'figma'} icon={<FigmaIco />} label="Figma Files" onClick={() => onSelect({ kind: 'section', section: 'figma' })} />
        <NavBtn active={activeKey === 'assets'} icon={<ImageIco />} label="Brand Assets" onClick={() => onSelect({ kind: 'section', section: 'logo' })} />
        <NavBtn active={activeKey === 'brochures'} icon={<FileTextIco />} label="Brochures" onClick={() => onSelect({ kind: 'section', section: 'brochure' })} />
        <NavBtn active={activeKey === 'videos'} icon={<PlayIco />} label="Videos" onClick={() => onSelect({ kind: 'section', section: 'video' })} />
        <NavBtn active={activeKey === 'events'} icon={<CalIco />} label="Events" onClick={() => onSelect({ kind: 'events' })} badge={seedEvents.filter(e => isUpcoming(e.date)).length} />
        <NavBtn active={activeKey === 'resources'} icon={<DownloadIco />} label="All Resources" onClick={() => onSelect({ kind: 'section', section: 'all' })} />

        <div className="mt-2 pt-2 border-t border-[var(--line-soft)]">
          <NavBtn active={view.kind === 'admin'} icon={<ShieldIco />} label="Admin" onClick={() => onSelect({ kind: 'admin' })} />
        </div>
      </nav>
    </aside>
  );
};

// ─── App shell ───────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [collapsed, setCollapsed] = useState(false);
  const [productsOpen, setProductsOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const [figmaResources, setFigmaResources] = useState<Resource[]>([]);
  const [figmaHasToken, setFigmaHasToken] = useState(false);
  const [figmaLastSyncedAt, setFigmaLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    getFigmaTokenStatus().then(setFigmaHasToken);
    getFigmaResources().then(({ resources, lastSyncedAt }) => {
      setFigmaResources(resources as Resource[]);
      setFigmaLastSyncedAt(lastSyncedAt);
    });
  }, []);

  const allResources = useMemo(() => [...seedResources, ...figmaResources], [figmaResources]);
  const currentProduct = view.kind === 'product' ? products.find(p => p.slug === view.slug) : undefined;

  return (
    <div className="flex h-screen bg-[var(--canvas)] overflow-hidden">
      <Sidebar
        view={view} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)}
        onSelect={setView} onSelectProduct={slug => setView({ kind: 'product', slug })}
        productsOpen={productsOpen} onToggleProducts={() => setProductsOpen(o => !o)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex-shrink-0 flex items-center gap-3 px-6 border-b border-[var(--line)] bg-white">
          <button onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--canvas)] border border-[var(--line-soft)] text-[var(--ink-45)] text-[13px] w-full max-w-sm hover:border-[var(--line)] transition-colors">
            <SearchIco /> <span>Search resources, events…</span>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-mono text-[11px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2a2f36, var(--ink))' }}>GR</div>
          </div>
        </header>

        {view.kind === 'home' ? (
          <HomeView resources={allResources} onSelectProduct={slug => setView({ kind: 'product', slug })} />
        ) : view.kind === 'product' && currentProduct ? (
          <ProductPage product={currentProduct} resources={allResources} />
        ) : view.kind === 'section' ? (
          <SectionPage
            section={view.section}
            resources={allResources}
            figmaMeta={view.section === 'figma' ? {
              hasToken: figmaHasToken,
              lastSyncedAt: figmaLastSyncedAt,
              onTokenSaved: () => setFigmaHasToken(true),
              onSynced: resources => { setFigmaResources(resources); setFigmaLastSyncedAt(new Date().toISOString()); },
            } : undefined}
          />
        ) : view.kind === 'events' ? (
          <EventsPage />
        ) : (
          <AdminPlaceholder />
        )}
      </div>

      {searchOpen && <SearchOverlay resources={allResources} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
