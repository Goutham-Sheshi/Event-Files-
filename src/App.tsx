import React, { useState, useEffect, useRef } from 'react';
import { catalogData as initialData, FolderNode, FileNode, CatalogData, EventItem } from './data';
import {
  getAllFolders, getAllFiles, findFolder, addToFolder,
  deleteFromTree, updateFile, updateFolderName,
  uid, guessFileType, FolderOption,
} from './utils';
import {
  setupStorage, loadCatalog, saveCatalog,
  loadEvents, saveEvents,
  uploadFile as uploadFileToServer, UploadResult,
} from './api';

// ─── Product config ──────────────────────────────────────────────────────────

const PRODUCT_CONFIG: Record<string, { color: string; light: string; from: string; to: string }> = {
  'Quanta':      { color: '#2563eb', light: '#dbeafe', from: '#1d4ed8', to: '#1e3a8a' },
  'Catalyx':     { color: '#7c3aed', light: '#ede9fe', from: '#6d28d9', to: '#4c1d95' },
  'FR':          { color: '#e04e2a', light: '#ffedd5', from: '#c2410c', to: '#7c2d12' },
  'Consultease': { color: '#15803d', light: '#dcfce7', from: '#15803d', to: '#14532d' },
};

function productCfg(name: string) {
  return PRODUCT_CONFIG[name] ?? { color: '#6b7280', light: '#f3f4f6', from: '#374151', to: '#111827' };
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number; total: number };

function computeTimeLeft(dateStr: string): TimeLeft | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    total: diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isUpcoming(dateStr: string) { return new Date(dateStr).getTime() > Date.now(); }
function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// ─── Migration: ensure Consultease exists ────────────────────────────────────

function ensureConsultease(catalog: CatalogData): CatalogData {
  const root = catalog[0] as FolderNode | undefined;
  if (root?.type !== 'folder') return catalog;
  const has = root.children.some(c => c.type === 'folder' && c.name === 'Consultease');
  if (has) return catalog;
  const newNode: FolderNode = {
    id: '1-4', name: 'Consultease', type: 'folder',
    children: [
      { id: '1-4-1', name: 'Logo', type: 'folder', children: [] },
      { id: '1-4-2', name: 'Brochure', type: 'folder', children: [] },
      { id: '1-4-3', name: 'Videos', type: 'folder', children: [] },
      { id: '1-4-4', name: 'Others', type: 'folder', children: [] },
    ],
  };
  return [{ ...root, children: [...root.children, newNode] }];
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {open ? <path d="m6 9 6 6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>
);
const FolderIco = ({ size = 20, color = '#a89d95' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);
const FileTypeIcon = ({ type, sz = 28 }: { type: FileNode['fileType']; sz?: number }) => {
  const props = { width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'image') return <svg {...props} stroke="#6baed6"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
  if (type === 'video') return <svg {...props} stroke="#9b8ecc"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><polygon points="10 11 15 14 10 17 10 11" fill="#9b8ecc" stroke="none" /></svg>;
  if (type === 'pdf') return <svg {...props} stroke="#e07a6a"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /></svg>;
  return <svg {...props} stroke="#a89d95"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
};
const DownloadIco = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
const PlusIco = ({ sz = 13 }: { sz?: number }) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>;
const XIco = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const EditIco = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const TrashIco = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
const LinkIco = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
const UploadCloudIco = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a89d95" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" x2="12" y1="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>;
const ShieldIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const HomeIco = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const CalIco = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>;

const FIELD = "w-full border border-[#e0dbd5] rounded-lg px-3 py-2 text-[13px] text-[#1c1a18] bg-white placeholder-[#c5bdb6] focus:outline-none focus:ring-2 focus:ring-[#e04e2a]/25 focus:border-[#e04e2a] transition-colors";
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-[#5a524c] uppercase tracking-wider mb-1.5">{children}</label>;
}
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full ${wide ? 'max-w-[560px]' : 'max-w-[440px]'} overflow-hidden`}>
        <div className="h-[3px] bg-gradient-to-r from-[#e04e2a] to-[#f0a488]" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e4de]">
          <h2 className="text-[16px] font-semibold text-[#1c1a18] tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f0ece7] text-[#a89d95] hover:text-[#1c1a18] transition-colors"><XIco /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────

const CountdownUnit = ({ value, label, dark }: { value: number; label: string; dark?: boolean }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-bold tabular-nums shadow-md ${
      dark ? 'bg-white/15 text-white backdrop-blur-sm shadow-black/10' : 'text-white shadow-black/20'
    }`} style={dark ? undefined : { background: 'linear-gradient(160deg, #2a2724, #1c1a18)' }}>
      {String(value).padStart(2, '0')}
    </div>
    <div className={`text-[9px] font-bold tracking-[0.12em] ${dark ? 'text-white/60' : 'text-[#a89d95]'}`}>{label}</div>
  </div>
);

const CountdownTimer = ({ date, dark = false }: { date: string; dark?: boolean }) => {
  const [t, setT] = useState(() => computeTimeLeft(date));
  useEffect(() => {
    const id = setInterval(() => setT(computeTimeLeft(date)), 1000);
    return () => clearInterval(id);
  }, [date]);
  if (!t) return (
    <span className={`text-[13px] font-semibold ${dark ? 'text-white/70' : 'text-[#a89d95]'}`}>Event has passed</span>
  );
  const sep = <span className={`text-[20px] font-light pb-4 ${dark ? 'text-white/30' : 'text-[#ddd8d2]'}`}>:</span>;
  return (
    <div className="flex items-end gap-1.5">
      <CountdownUnit value={t.days} label="DAYS" dark={dark} />
      {sep}
      <CountdownUnit value={t.hours} label="HRS" dark={dark} />
      {sep}
      <CountdownUnit value={t.minutes} label="MIN" dark={dark} />
      {sep}
      <CountdownUnit value={t.seconds} label="SEC" dark={dark} />
    </div>
  );
};

const MiniCountdown = ({ date }: { date: string }) => {
  const [t, setT] = useState(() => computeTimeLeft(date));
  useEffect(() => {
    const id = setInterval(() => setT(computeTimeLeft(date)), 1000);
    return () => clearInterval(id);
  }, [date]);
  if (!t) return <span className="text-[11px] text-[#a89d95]">Passed</span>;
  if (t.days === 0 && t.hours === 0) return <span className="text-[12px] font-bold text-[#e04e2a] animate-pulse">Today!</span>;
  if (t.days === 0) return <span className="text-[12px] font-semibold text-[#e04e2a]">{t.hours}h {t.minutes}m</span>;
  if (t.days === 1) return <span className="text-[12px] font-semibold text-amber-600">Tomorrow</span>;
  return <span className="text-[12px] font-semibold text-[#1c1a18]">{t.days} days</span>;
};

const ProductBadge = ({ product, dark }: { product: string; dark?: boolean }) => {
  const cfg = productCfg(product);
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={dark ? { background: 'rgba(255,255,255,0.18)', color: '#fff' } : { background: cfg.light, color: cfg.color }}>
      {product}
    </span>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

type SidebarShared = {
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

const SidebarNode = ({
  node, level, index, selectedId, expandedIds, onSelect, onToggle,
}: SidebarShared & { node: FolderNode; level: number; index?: number }) => {
  const isSelected = selectedId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const subFolders = node.children.filter((c): c is FolderNode => c.type === 'folder');
  return (
    <div>
      <button
        onClick={() => { onSelect(node.id); if (subFolders.length > 0) onToggle(node.id); }}
        style={{ paddingLeft: `${8 + level * 14}px`, paddingRight: '8px' }}
        className={`w-full flex items-center gap-1.5 py-[7px] rounded-lg text-[13px] text-left transition-all leading-none ${
          isSelected ? 'bg-[#e04e2a] text-white font-medium shadow-sm shadow-[#e04e2a]/30' : 'text-[#5a524c] hover:bg-[#e5e1db] hover:text-[#1c1a18]'
        }`}
      >
        {level === 1 && <span className={`text-[11px] font-mono w-4 flex-shrink-0 ${isSelected ? 'text-white/60' : 'text-[#b5aa9e]'}`}>{index}</span>}
        {level > 1 && <span className="w-3 flex-shrink-0 opacity-60">{subFolders.length > 0 ? <Chevron open={isExpanded} /> : null}</span>}
        <span className="flex-1 truncate">{node.name}</span>
        {level === 1 && subFolders.length > 0 && <span className={`flex-shrink-0 ${isSelected ? 'text-white/60' : 'text-[#b5aa9e]'}`}><Chevron open={isExpanded} /></span>}
      </button>
      {isExpanded && subFolders.map((child, i) => (
        <SidebarNode key={child.id} node={child} level={level + 1} index={i + 1}
          selectedId={selectedId} expandedIds={expandedIds} onSelect={onSelect} onToggle={onToggle} />
      ))}
    </div>
  );
};

const Sidebar = ({
  catalog, selectedId, expandedIds, onSelect, onToggle, appView, onToggleAdmin, onGoHome, upcomingCount,
}: SidebarShared & { catalog: CatalogData; appView: 'browse' | 'admin' | 'eventFiles'; onToggleAdmin: () => void; onGoHome: () => void; upcomingCount: number }) => {
  const root = catalog[0] as FolderNode | undefined;
  const events = root?.type === 'folder' ? root.children.filter((c): c is FolderNode => c.type === 'folder') : [];
  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[#f0ece7] border-r border-[#ddd8d2] overflow-hidden">
      <div className="px-4 py-4 border-b border-[#ddd8d2] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#e04e2a]/30" style={{ background: 'linear-gradient(135deg, #e5673f, #c9451f)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#1c1a18] leading-tight tracking-tight">Media Catalog</div>
          <div className="text-[11px] text-[#a89d95] leading-tight">Branding 2.0</div>
        </div>
      </div>
      <div className="px-3 pt-3 pb-1">
        <button onClick={() => { onGoHome(); root && onSelect(root.id); }}
          className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13px] text-left transition-colors ${
            (appView === 'browse' || appView === 'eventFiles') && root && selectedId === root.id ? 'bg-[#e04e2a] text-white font-medium' : 'text-[#5a524c] hover:bg-[#e5e1db]'
          }`}>
          <HomeIco />
          <span className="flex-1">Home</span>
          {upcomingCount > 0 && <span className="bg-[#e04e2a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">{upcomingCount}</span>}
        </button>
      </div>
      <div className="px-3 pt-3 pb-2 flex-1 overflow-y-auto">
        <div className="text-[10px] font-semibold tracking-[0.1em] text-[#a89d95] uppercase px-2 mb-2">Pages</div>
        <div className="flex flex-col gap-0.5">
          {events.map((evt, i) => (
            <SidebarNode key={evt.id} node={evt} level={1} index={i + 1}
              selectedId={appView === 'browse' ? selectedId : ''}
              expandedIds={expandedIds}
              onSelect={id => { if (appView === 'admin') onToggleAdmin(); onSelect(id); }}
              onToggle={onToggle} />
          ))}
        </div>
      </div>
      <div className="px-3 py-3 border-t border-[#ddd8d2]">
        <button onClick={onToggleAdmin}
          className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors ${
            appView === 'admin' ? 'bg-[#1c1a18] text-white font-medium' : 'text-[#5a524c] hover:bg-[#e5e1db]'
          }`}>
          <ShieldIco /> Admin
        </button>
      </div>
    </aside>
  );
};

// ─── Home View ────────────────────────────────────────────────────────────────

const FeaturedEventHero = ({ event, onEdit, onViewFiles }: { event: EventItem; onEdit?: () => void; onViewFiles?: () => void }) => {
  const cfg = productCfg(event.product);
  const hasImg = !!event.bannerUrl;
  const todayEvent = isToday(event.date);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 280 }}>
      {hasImg ? (
        <img src={event.bannerUrl} alt={event.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }} />
      )}
      <div className="absolute inset-0" style={{ background: hasImg ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.2) 100%)' : 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />

      <div className="relative z-10 flex flex-col justify-between h-full p-7" style={{ minHeight: 280 }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <ProductBadge product={event.product} dark />
            {todayEvent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e04e2a] text-white animate-pulse">TODAY</span>
            )}
          </div>
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-sm">
              <EditIco />
            </button>
          )}
        </div>

        <div>
          <h2 className="text-[28px] font-bold text-white leading-tight tracking-tight mb-1">{event.name}</h2>
          <p className="text-white/60 text-[13px] mb-4">{formatDate(event.date)}</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <CountdownTimer date={event.date} dark />
            {onViewFiles && (
              <button onClick={onViewFiles}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[12px] font-semibold rounded-xl transition-colors border border-white/20 hover:border-white/40 whitespace-nowrap">
                View Related Files
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const UpcomingEventCard = ({ event, onEdit, onViewFiles }: { event: EventItem; onEdit?: () => void; onViewFiles?: () => void }) => {
  const cfg = productCfg(event.product);
  const hasImg = !!event.bannerUrl;
  return (
    <div className="bg-white border border-[#e8e4de] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      {/* Image */}
      <div className="h-[80px] relative overflow-hidden flex-shrink-0"
        style={{ background: hasImg ? undefined : `linear-gradient(135deg, ${cfg.from}cc, ${cfg.to})` }}>
        {hasImg && <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/25" />
        {onEdit && (
          <button onClick={onEdit} className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <EditIco />
          </button>
        )}
        <div className="absolute bottom-2 left-2">
          <ProductBadge product={event.product} dark />
        </div>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1.5 flex-1">
        <div className="text-[12px] font-semibold text-[#1c1a18] leading-snug line-clamp-2">{event.name}</div>
        <div className="text-[10px] text-[#a89d95]">{formatShortDate(event.date)}</div>
        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-[#f0ece7]">
          <MiniCountdown date={event.date} />
          {onViewFiles && (
            <button onClick={onViewFiles} className="flex items-center gap-1 text-[10px] font-semibold hover:underline" style={{ color: cfg.color }}>
              Files
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PastEventRow = ({ event, onViewFiles }: { event: EventItem; onViewFiles?: () => void }) => {
  const cfg = productCfg(event.product);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f4f1] transition-colors group">
      <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}>
        {event.bannerUrl && <img src={event.bannerUrl} alt="" className="w-full h-full object-cover opacity-60" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#5a524c] truncate">{event.name}</div>
        <div className="text-[11px] text-[#c5bdb6]">{formatShortDate(event.date)}</div>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: cfg.light, color: cfg.color }}>
        {event.product}
      </span>
      {onViewFiles && (
        <button onClick={onViewFiles} className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-[#a89d95] hover:text-[#1c1a18] opacity-0 group-hover:opacity-100 transition-opacity">
          Files
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ─── Event Files View ──────────────────────────────────────────────────────────

const EventFilesView = ({
  event, onBack, onUpdateEvent,
}: { event: EventItem; onBack: () => void; onUpdateEvent: (e: EventItem) => void }) => {
  const cfg = productCfg(event.product);
  const files = event.files ?? [];

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFile = (f: FileNode) => onUpdateEvent({ ...event, files: [...files, f] });
  const removeFile = (id: string) => onUpdateEvent({ ...event, files: files.filter(f => f.id !== id) });

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const result = await uploadFileToServer(file);
      addFile({ id: uid(), name: result.name, type: 'file', fileType: guessFileType(result.name), url: result.url, thumbnailUrl: result.thumbnailUrl, size: result.size });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkAdd = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    addFile({ id: uid(), name: linkName.trim(), type: 'file', fileType: guessFileType(linkName.trim()), url: linkUrl.trim() });
    setLinkName(''); setLinkUrl(''); setShowLinkForm(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: 176 }}>
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={event.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        <button onClick={onBack}
          className="absolute top-4 left-6 flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[12px] font-medium rounded-lg border border-white/20 transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Home
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <ProductBadge product={event.product} dark />
            <h1 className="text-[20px] font-bold text-white leading-tight mt-1.5 truncate">{event.name}</h1>
            <p className="text-white/55 text-[12px] mt-0.5">{formatDate(event.date)}</p>
          </div>
          <div className="flex-shrink-0 pb-0.5">
            <MiniCountdown date={event.date} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-[#e8e4de] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="text-[13px] font-semibold text-[#1c1a18]">
          {files.length === 0 ? 'No files yet' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowLinkForm(v => !v); }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e0dbd5] text-[#5a524c] text-[12px] font-medium rounded-lg hover:bg-[#f7f4f1] transition-colors">
            <LinkIco /> Paste Link
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e04e2a] text-white text-[12px] font-medium rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all">
            <PlusIco sz={11} /> Upload File
          </button>
        </div>
      </div>

      {/* Link form */}
      {showLinkForm && (
        <div className="px-8 py-3 bg-[#faf8f6] border-b border-[#e8e4de] flex items-end gap-3 flex-shrink-0">
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-[#5a524c] mb-1">File Name</div>
            <input type="text" value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Presentation.pdf" className={FIELD} />
          </div>
          <div className="flex-[2]">
            <div className="text-[11px] font-semibold text-[#5a524c] mb-1">URL</div>
            <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" className={FIELD} />
          </div>
          <button onClick={handleLinkAdd} disabled={!linkName.trim() || !linkUrl.trim()}
            className="px-4 py-2 bg-[#1c1a18] text-white text-[12px] font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-40 flex-shrink-0">
            Add
          </button>
          <button onClick={() => setShowLinkForm(false)} className="p-2 text-[#a89d95] hover:text-[#1c1a18] flex-shrink-0"><XIco /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}>

        {uploadError && <p className="text-[12px] text-red-500 mb-4">{uploadError}</p>}

        {files.length === 0 && !uploading ? (
          <div className={`flex flex-col items-center justify-center h-full py-16 text-center rounded-2xl border-2 border-dashed transition-colors ${dragOver ? 'border-[#e04e2a]/50 bg-[#fff5f2]' : 'border-[#e8e4de] bg-[#faf8f6]'}`}>
            <UploadCloudIco />
            <div className="text-[14px] font-medium text-[#1c1a18] mt-3">Drop files here</div>
            <div className="text-[12px] text-[#a89d95] mt-1">or use the buttons above to upload or paste a link</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {uploading && (
              <div className="bg-[#f7f4f1] border border-[#e8e4de] rounded-xl h-[156px] flex flex-col items-center justify-center gap-2">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a89d95" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                <span className="text-[11px] text-[#a89d95]">Uploading…</span>
              </div>
            )}
            {files.map(f => (
              <div key={f.id} className="group bg-white border border-[#e8e4de] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative">
                <div className="h-[110px] bg-[#f7f4f1] flex items-center justify-center relative overflow-hidden">
                  {f.thumbnailUrl
                    ? <img src={f.thumbnailUrl} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                    : <FileTypeIcon type={f.fileType} sz={28} />
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => removeFile(f.id)}
                      className="flex items-center gap-1 bg-red-500/80 text-white text-[10px] font-medium px-1.5 py-1 rounded-md">
                      <TrashIco /> Remove
                    </button>
                    <a href={f.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 bg-white text-[#1c1a18] text-[10px] font-medium px-1.5 py-1 rounded-md shadow-sm">
                      <DownloadIco /> Open
                    </a>
                  </div>
                </div>
                <div className="px-2.5 py-2">
                  <div className="text-[11px] font-medium text-[#1c1a18] truncate">{f.name}</div>
                  {f.size && <div className="text-[10px] text-[#a89d95] mt-0.5">{f.size}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
    </div>
  );
};

const HomeView = ({
  catalog, events, onSelect, onAddFile, onAdminEvents, onViewEventFiles,
}: { catalog: CatalogData; events: EventItem[]; onSelect: (id: string) => void; onAddFile: () => void; onAdminEvents: () => void; onViewEventFiles: (e: EventItem) => void }) => {
  const root = catalog[0] as FolderNode | undefined;
  const products = root?.type === 'folder' ? root.children.filter((c): c is FolderNode => c.type === 'folder') : [];
  const allFiles = getAllFiles(catalog);

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter(e => isUpcoming(e.date));
  const past = sorted.filter(e => !isUpcoming(e.date)).reverse(); // most recent past first

  const featured = upcoming[0];
  const otherUpcoming = upcoming.slice(1);

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#e8e4de] flex items-center justify-between">
        <div>
          <div className="text-[11px] text-[#a89d95] uppercase tracking-wider font-medium mb-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="text-[22px] font-bold text-[#1c1a18] tracking-tight leading-none">Home</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdminEvents}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#e0dbd5] text-[#5a524c] text-[13px] font-medium rounded-lg hover:bg-[#f7f4f1] transition-colors">
            <CalIco /> Manage Events
          </button>
          <button onClick={onAddFile}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#e04e2a] text-white text-[13px] font-medium rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all">
            <PlusIco /> Add File
          </button>
        </div>
      </div>

      <div className="px-8 py-7 flex flex-col gap-10">

        {/* ── Events section ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-[#1c1a18]">Events</h2>
            <button onClick={onAdminEvents} className="text-[12px] text-[#e04e2a] font-medium hover:underline flex items-center gap-1">
              <PlusIco sz={10} /> Add event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-[#faf8f6] rounded-2xl border border-[#e8e4de] border-dashed">
              <CalIco />
              <div className="text-[14px] font-medium text-[#1c1a18] mt-3">No events yet</div>
              <div className="text-[12px] text-[#a89d95] mt-1">Add upcoming events to track them here with live countdowns.</div>
              <button onClick={onAdminEvents} className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#1c1a18] text-white text-[13px] font-medium rounded-lg hover:bg-black transition-colors">
                <PlusIco sz={11} /> Create first event
              </button>
            </div>
          ) : (
            <>
              {/* Featured hero */}
              {featured && (
                <div className="mb-5">
                  <FeaturedEventHero event={featured} onViewFiles={() => onViewEventFiles(featured)} />
                </div>
              )}

              {/* Other upcoming */}
              {otherUpcoming.length > 0 && (
                <div className="mb-5">
                  <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-3">Also coming up</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {otherUpcoming.map(e => (
                      <UpcomingEventCard key={e.id} event={e} onViewFiles={() => onViewEventFiles(e)} />
                    ))}
                  </div>
                </div>
              )}

              {/* No upcoming */}
              {upcoming.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-[#faf8f6] rounded-xl border border-[#e8e4de] mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a89d95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span className="text-[13px] text-[#a89d95]">No upcoming events. <button onClick={onAdminEvents} className="text-[#e04e2a] font-medium hover:underline">Add one</button></span>
                </div>
              )}

              {/* Past events */}
              {past.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-2">Past events</div>
                  <div className="flex flex-col">
                    {past.map(e => (
                      <PastEventRow key={e.id} event={e} onViewFiles={() => onViewEventFiles(e)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Stats ── */}
        <div>
          <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-3">Catalog</div>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Products', value: products.length },
              { label: 'Total Files', value: allFiles.length },
              { label: 'Folders', value: getAllFolders(catalog).length },
              { label: 'Events', value: events.length },
            ].map(s => (
              <div key={s.label} className="bg-[#f7f4f1] rounded-xl px-4 py-3">
                <div className="text-[22px] font-bold text-[#1c1a18] leading-none">{s.value}</div>
                <div className="text-[11px] text-[#a89d95] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Product quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {products.map(p => {
              const cfg = productCfg(p.name);
              const fileCount = getAllFiles(p.children).length;
              return (
                <button key={p.id} onClick={() => onSelect(p.id)}
                  className="text-left rounded-xl px-4 py-3.5 border border-[#e8e4de] hover:border-transparent transition-all group"
                  style={{ background: `linear-gradient(135deg, ${cfg.from}12, ${cfg.to}22)` }}>
                  <div className="w-7 h-7 rounded-lg mb-2.5 flex items-center justify-center" style={{ background: cfg.light }}>
                    <FolderIco size={14} color={cfg.color} />
                  </div>
                  <div className="text-[13px] font-semibold text-[#1c1a18]">{p.name}</div>
                  <div className="text-[11px] text-[#a89d95] mt-0.5">{fileCount} files</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent files */}
        {allFiles.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-3">Recent Files</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...allFiles].reverse().slice(0, 10).map(f => (
                <div key={f.id} className="group bg-white border border-[#e8e4de] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className="h-[100px] bg-[#f7f4f1] flex items-center justify-center relative overflow-hidden">
                    {f.thumbnailUrl ? <img src={f.thumbnailUrl} alt={f.name} className="w-full h-full object-cover" loading="lazy" /> : <FileTypeIcon type={f.fileType} sz={24} />}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
                      <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white text-[#1c1a18] text-[10px] font-medium px-2 py-1 rounded-md shadow-sm">
                        <DownloadIco />
                      </a>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <div className="text-[11px] font-medium text-[#1c1a18] truncate">{f.name}</div>
                    <div className="text-[10px] text-[#a89d95] truncate mt-0.5">{f.folderPath}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Browse Panel ─────────────────────────────────────────────────────────────

const BrowsePanel = ({ folder, onSelect, onAddFile }: { folder: FolderNode | null; onSelect: (id: string) => void; onAddFile: () => void }) => {
  if (!folder) return <div className="flex-1 flex items-center justify-center text-[#a89d95] text-sm bg-white">Select a folder.</div>;
  const subFolders = folder.children.filter((c): c is FolderNode => c.type === 'folder');
  const files = folder.children.filter((c): c is FileNode => c.type === 'file');
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="px-8 py-5 border-b border-[#e8e4de] flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#f0ece7] flex items-center justify-center flex-shrink-0"><FolderIco size={20} color="#7a6e68" /></div>
          <div className="min-w-0">
            <div className="text-[11px] text-[#a89d95] uppercase tracking-wider font-medium leading-none mb-1">{folder.children.length} items</div>
            <h1 className="text-[22px] font-bold text-[#1c1a18] tracking-tight leading-none truncate">{folder.name}</h1>
          </div>
        </div>
        <button onClick={onAddFile} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#e04e2a] text-white text-[13px] font-medium rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all flex-shrink-0">
          <PlusIco /> Add File
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {folder.children.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <FolderIco size={52} color="#d5cec9" />
            <div className="text-[14px] text-[#a89d95] mt-4">Empty folder</div>
            <button onClick={onAddFile} className="mt-3 text-[13px] text-[#e04e2a] hover:underline font-medium">Add a file</button>
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            {subFolders.length > 0 && (
              <div>
                {files.length > 0 && <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-3">Folders</div>}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {subFolders.map(f => (
                    <button key={f.id} onClick={() => onSelect(f.id)} className="bg-white border border-[#e8e4de] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
                      <div className="h-[140px] bg-[#f7f4f1] flex items-center justify-center"><FolderIco size={44} color="#c5bdb6" /></div>
                      <div className="px-3 py-2.5">
                        <div className="text-[12px] font-medium text-[#1c1a18] truncate">{f.name}</div>
                        <div className="text-[11px] text-[#a89d95] mt-0.5">{f.children.length === 0 ? 'Empty' : `${f.children.length} items`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div>
                {subFolders.length > 0 && <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-3">Files</div>}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {files.map(f => (
                    <div key={f.id} className="group bg-white border border-[#e8e4de] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                      <div className="h-[140px] bg-[#f7f4f1] flex items-center justify-center relative overflow-hidden">
                        {f.thumbnailUrl ? <img src={f.thumbnailUrl} alt={f.name} className="w-full h-full object-cover" loading="lazy" /> : <FileTypeIcon type={f.fileType} />}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-end justify-end p-2.5 opacity-0 group-hover:opacity-100">
                          <a href={f.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 bg-white text-[#1c1a18] text-[11px] font-medium px-2.5 py-1.5 rounded-md shadow-sm"><DownloadIco /> Download</a>
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        <div className="text-[12px] font-medium text-[#1c1a18] truncate">{f.name}</div>
                        {f.size && <div className="text-[11px] text-[#a89d95] mt-0.5">{f.size}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Admin View ───────────────────────────────────────────────────────────────

type AdminShared = { catalog: CatalogData; onUpdate: (c: CatalogData) => void };

const AdminTreeNode = ({ node, level, catalog, onUpdate, selectedId, onSelect }: AdminShared & { node: FolderNode; level: number; selectedId: string; onSelect: (id: string) => void }) => {
  const [open, setOpen] = useState(level < 2);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(node.name);
  const renameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming) renameRef.current?.focus(); }, [renaming]);
  const subFolders = node.children.filter((c): c is FolderNode => c.type === 'folder');
  const isSelected = selectedId === node.id;
  const commitRename = () => {
    if (draftName.trim() && draftName.trim() !== node.name) onUpdate(updateFolderName(catalog, node.id, draftName.trim()));
    setRenaming(false);
  };
  const handleDelete = () => {
    const count = node.children.length;
    if (count > 0 && !confirm(`Delete "${node.name}" and all its contents?`)) return;
    onUpdate(deleteFromTree(catalog, node.id));
  };
  return (
    <div>
      <div
        onClick={() => { onSelect(node.id); if (subFolders.length) setOpen(o => !o); }}
        className={`group flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-[#fff0ec]' : 'hover:bg-[#f7f4f1]'}`}
        style={{ paddingLeft: `${8 + level * 14}px`, paddingRight: '6px' }}
      >
        <span className="w-3 flex-shrink-0 text-[#b5aa9e]">{subFolders.length > 0 ? <Chevron open={open} /> : null}</span>
        <FolderIco size={14} color={isSelected ? '#e04e2a' : '#a89d95'} />
        {renaming ? (
          <input ref={renameRef} value={draftName} onChange={e => setDraftName(e.target.value)} onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="flex-1 text-[13px] border border-[#e04e2a] rounded px-1.5 py-0.5 outline-none"
            onClick={e => e.stopPropagation()} />
        ) : (
          <span className={`flex-1 truncate text-[13px] ${isSelected ? 'text-[#e04e2a] font-medium' : 'text-[#1c1a18]'}`}>{node.name}</span>
        )}
        <span className="text-[10px] text-[#c5bdb6] group-hover:hidden">{node.children.length}</span>
        <span className="hidden group-hover:flex items-center gap-0.5">
          <button onClick={e => { e.stopPropagation(); setRenaming(true); setDraftName(node.name); }} className="p-1 rounded hover:bg-[#e8e4de] text-[#a89d95] hover:text-[#1c1a18]"><EditIco /></button>
          <button onClick={e => { e.stopPropagation(); handleDelete(); }} className="p-1 rounded hover:bg-red-50 text-[#a89d95] hover:text-red-500"><TrashIco /></button>
        </span>
      </div>
      {open && subFolders.map(child => (
        <AdminTreeNode key={child.id} node={child} level={level + 1} catalog={catalog} onUpdate={onUpdate} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
};

const CatalogAdmin = ({ catalog, onUpdate, onAddFile, onEditFile }: AdminShared & { onAddFile: () => void; onEditFile: (f: FileNode) => void }) => {
  const root = catalog[0] as FolderNode | undefined;
  const events = root?.type === 'folder' ? root.children.filter((c): c is FolderNode => c.type === 'folder') : [];
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? '');
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const newEventRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (showNewEvent) newEventRef.current?.focus(); }, [showNewEvent]);

  const createPage = () => {
    if (!newEventName.trim() || !root) return;
    const newPage: FolderNode = {
      id: uid(), name: newEventName.trim(), type: 'folder',
      children: [
        { id: uid(), name: 'Logo', type: 'folder', children: [] },
        { id: uid(), name: 'Brochure', type: 'folder', children: [] },
        { id: uid(), name: 'Videos', type: 'folder', children: [] },
        { id: uid(), name: 'Others', type: 'folder', children: [] },
      ],
    };
    onUpdate(addToFolder(catalog, root.id, newPage));
    setNewEventName(''); setShowNewEvent(false); setSelectedId(newPage.id);
  };

  const selectedFolder = findFolder(catalog, selectedId);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const addFolderRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (showNewFolder) addFolderRef.current?.focus(); }, [showNewFolder]);
  const commitNewFolder = () => {
    if (newFolderName.trim() && selectedFolder) {
      onUpdate(addToFolder(catalog, selectedFolder.id, { id: uid(), name: newFolderName.trim(), type: 'folder', children: [] }));
      setNewFolderName(''); setShowNewFolder(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Tree */}
      <div className="w-[220px] flex-shrink-0 border-r border-[#e8e4de] flex flex-col bg-[#faf8f6]">
        <div className="px-4 py-3 border-b border-[#e8e4de] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider">Pages</span>
          <button onClick={() => setShowNewEvent(v => !v)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#e8e4de] text-[#a89d95] hover:text-[#1c1a18] transition-colors"><PlusIco sz={12} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {showNewEvent && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1 bg-white rounded-lg border border-[#e04e2a]/30">
              <input ref={newEventRef} value={newEventName} onChange={e => setNewEventName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createPage(); if (e.key === 'Escape') setShowNewEvent(false); }}
                placeholder="Page name…" className="flex-1 text-[13px] outline-none bg-transparent text-[#1c1a18] placeholder-[#c5bdb6]" />
              <button onClick={createPage} className="text-[11px] text-[#e04e2a] font-medium hover:underline">Add</button>
            </div>
          )}
          {events.map(evt => (
            <AdminTreeNode key={evt.id} node={evt} level={0} catalog={catalog} onUpdate={onUpdate} selectedId={selectedId} onSelect={setSelectedId} />
          ))}
        </div>
      </div>

      {/* Content */}
      {selectedFolder ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#e8e4de] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FolderIco size={16} color="#7a6e68" />
              <span className="text-[15px] font-semibold text-[#1c1a18]">{selectedFolder.name}</span>
              <span className="text-[12px] text-[#a89d95]">— {selectedFolder.children.length} items</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewFolder(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e0dbd5] text-[#5a524c] text-[12px] font-medium rounded-lg hover:bg-[#f7f4f1] transition-colors"><PlusIco sz={11} /> Subfolder</button>
              <button onClick={onAddFile} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e04e2a] text-white text-[12px] font-medium rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all"><PlusIco sz={11} /> Add File</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {showNewFolder && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#f7f4f1] rounded-xl border border-[#e8e4de]">
                <FolderIco size={16} color="#a89d95" />
                <input ref={addFolderRef} value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitNewFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                  placeholder="Folder name…" className="flex-1 text-[13px] bg-transparent outline-none text-[#1c1a18] placeholder-[#c5bdb6]" />
                <button onClick={commitNewFolder} className="px-2.5 py-1 bg-[#e04e2a] text-white text-[12px] rounded-lg">Create</button>
                <button onClick={() => setShowNewFolder(false)} className="text-[#a89d95]"><XIco /></button>
              </div>
            )}
            {selectedFolder.children.length === 0 && !showNewFolder && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderIco size={40} color="#d5cec9" /><div className="text-[13px] text-[#a89d95] mt-3">Empty folder</div>
              </div>
            )}
            {selectedFolder.children.filter(c => c.type === 'folder').length > 0 && (
              <div className="mb-5">
                <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-2">Subfolders</div>
                {(selectedFolder.children.filter(c => c.type === 'folder') as FolderNode[]).map(f => (
                  <div key={f.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f4f1] border border-transparent hover:border-[#e8e4de] transition-colors">
                    <FolderIco size={16} color="#a89d95" />
                    <span className="flex-1 text-[13px] font-medium text-[#1c1a18]">{f.name}</span>
                    <span className="text-[11px] text-[#c5bdb6]">{f.children.length} items</span>
                    <button onClick={() => { if (!confirm(`Delete "${f.name}"?`)) return; onUpdate(deleteFromTree(catalog, f.id)); }} className="hidden group-hover:block p-1.5 rounded-lg hover:bg-red-50 text-[#c5bdb6] hover:text-red-500"><TrashIco /></button>
                  </div>
                ))}
              </div>
            )}
            {selectedFolder.children.filter(c => c.type === 'file').length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-2">Files</div>
                {(selectedFolder.children.filter(c => c.type === 'file') as FileNode[]).map(f => (
                  <div key={f.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f4f1] border border-transparent hover:border-[#e8e4de] transition-colors">
                    <FileTypeIcon type={f.fileType} sz={16} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1c1a18] truncate">{f.name}</div>
                      <div className="text-[11px] text-[#c5bdb6] font-mono truncate">{f.url}</div>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={() => onEditFile(f)} className="p-1.5 rounded-lg hover:bg-[#e8e4de] text-[#c5bdb6] hover:text-[#1c1a18]"><EditIco /></button>
                      <button onClick={() => { if (!confirm('Delete this file?')) return; onUpdate(deleteFromTree(catalog, f.id)); }} className="p-1.5 rounded-lg hover:bg-red-50 text-[#c5bdb6] hover:text-red-500"><TrashIco /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center"><div><FolderIco size={40} color="#d5cec9" /><div className="text-[13px] text-[#a89d95] mt-3">Select a page</div></div></div>
      )}
    </div>
  );
};

// Events admin panel
const EventsAdmin = ({
  events, catalog, onUpdate, onEdit,
}: { events: EventItem[]; catalog: CatalogData; onUpdate: (e: EventItem[]) => void; onEdit: (e: EventItem | null) => void }) => {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter(e => isUpcoming(e.date));
  const past = sorted.filter(e => !isUpcoming(e.date)).reverse();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this event?')) return;
    onUpdate(events.filter(e => e.id !== id));
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-[#e8e4de] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1c1a18]">Events</h2>
          <p className="text-[12px] text-[#a89d95]">{upcoming.length} upcoming · {past.length} past</p>
        </div>
        <button onClick={() => onEdit(null)} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#e04e2a] text-white text-[13px] font-medium rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all">
          <PlusIco sz={11} /> Add Event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalIco />
            <div className="text-[14px] font-medium text-[#1c1a18] mt-3">No events yet</div>
            <button onClick={() => onEdit(null)} className="mt-4 px-4 py-2 bg-[#1c1a18] text-white text-[13px] font-medium rounded-lg">Create first event</button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {upcoming.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-2">Upcoming ({upcoming.length})</div>
                <div className="flex flex-col gap-1">
                  {upcoming.map(e => {
                    const cfg = productCfg(e.product);
                    return (
                      <div key={e.id} className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#f7f4f1] border border-transparent hover:border-[#e8e4de] transition-colors">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}>
                          {e.bannerUrl && <img src={e.bannerUrl} alt="" className="w-full h-full object-cover opacity-70" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#1c1a18] truncate">{e.name}</div>
                          <div className="text-[11px] text-[#a89d95]">{formatShortDate(e.date)}</div>
                        </div>
                        <ProductBadge product={e.product} />
                        <MiniCountdown date={e.date} />
                        <div className="hidden group-hover:flex items-center gap-1 ml-2">
                          <button onClick={() => onEdit(e)} className="p-1.5 rounded-lg hover:bg-[#e8e4de] text-[#c5bdb6] hover:text-[#1c1a18]"><EditIco /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#c5bdb6] hover:text-red-500"><TrashIco /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider mb-2">Past ({past.length})</div>
                <div className="flex flex-col gap-1">
                  {past.map(e => {
                    const cfg = productCfg(e.product);
                    return (
                      <div key={e.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f4f1] transition-colors opacity-60 hover:opacity-100">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}>
                          {e.bannerUrl && <img src={e.bannerUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[#5a524c] truncate">{e.name}</div>
                          <div className="text-[11px] text-[#c5bdb6]">{formatShortDate(e.date)}</div>
                        </div>
                        <ProductBadge product={e.product} />
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={() => onEdit(e)} className="p-1.5 rounded-lg hover:bg-[#e8e4de] text-[#c5bdb6] hover:text-[#1c1a18]"><EditIco /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#c5bdb6] hover:text-red-500"><TrashIco /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminView = ({
  catalog, onUpdate: onUpdateCatalog, events, onUpdateEvents, onAddFile, onEditFile, initialTab,
}: AdminShared & {
  events: EventItem[];
  onUpdateEvents: (e: EventItem[]) => void;
  onAddFile: (folderId: string) => void;
  onEditFile: (f: FileNode) => void;
  initialTab?: 'catalog' | 'events';
}) => {
  const [tab, setTab] = useState<'catalog' | 'events'>(initialTab ?? 'catalog');
  const [editingEvent, setEditingEvent] = useState<EventItem | null | 'new'>('new' as never);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  const openEventEditor = (e: EventItem | null) => {
    setEditingEvent(e ?? null);
    setShowEventModal(true);
  };

  const root = catalog[0] as FolderNode | undefined;
  const products = root?.type === 'folder' ? root.children.filter(c => c.type === 'folder').map(c => c.name) : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-[#e8e4de] px-6 bg-[#faf8f6] flex-shrink-0">
        {(['catalog', 'events'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-[#e04e2a] text-[#e04e2a]' : 'border-transparent text-[#a89d95] hover:text-[#5a524c]'
            }`}>
            {t === 'events' ? `Events${events.length > 0 ? ` (${events.length})` : ''}` : 'Catalog'}
          </button>
        ))}
      </div>

      {tab === 'catalog' ? (
        <CatalogAdmin catalog={catalog} onUpdate={onUpdateCatalog} onAddFile={() => onAddFile('')} onEditFile={onEditFile} />
      ) : (
        <EventsAdmin events={events} catalog={catalog} onUpdate={onUpdateEvents} onEdit={openEventEditor} />
      )}

      {showEventModal && (
        <EventModal
          event={editingEvent as EventItem | null}
          products={products}
          onSave={event => {
            if (editingEvent) {
              onUpdateEvents(events.map(e => e.id === event.id ? event : e));
            } else {
              onUpdateEvents([...events, event]);
            }
            setShowEventModal(false);
          }}
          onClose={() => setShowEventModal(false)}
        />
      )}
    </div>
  );
};

// ─── Event Modal ──────────────────────────────────────────────────────────────

const BannerField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please pick an image file.'); return; }
    setUploading(true);
    setError('');
    try {
      const result = await uploadFileToServer(file);
      onChange(result.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="h-[150px] rounded-xl overflow-hidden relative border border-[#e8e4de] group">
          <img src={value} alt="Banner" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-end justify-between">
            <span className="text-white/70 text-[10px] font-medium">Banner image</span>
            <div className="flex gap-1.5">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/35 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-md transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" /><line x1="12" x2="12" y1="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                Replace
              </button>
              <button onClick={() => onChange('')}
                className="flex items-center gap-1 bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-md transition-colors">
                <XIco /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-7 border-2 border-dashed border-[#e0dbd5] rounded-xl hover:border-[#e04e2a]/40 hover:bg-[#faf8f6] transition-colors text-[#a89d95] hover:text-[#5a524c]"
        >
          {uploading ? (
            <>
              <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <span className="text-[12px]">Uploading…</span>
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="text-[12px] font-medium">Upload banner image</span>
              <span className="text-[11px]">Drag a screenshot or click to browse</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
};

const EventModal = ({
  event, products, onSave, onClose,
}: { event: EventItem | null; products: string[]; onSave: (e: EventItem) => void; onClose: () => void }) => {
  const toDateValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [name, setName] = useState(event?.name ?? '');
  const [dateVal, setDateVal] = useState(event ? toDateValue(event.date) : '');
  const [product, setProduct] = useState(event?.product ?? (products[0] ?? ''));
  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) { setError('Event name is required.'); return; }
    if (!dateVal) { setError('Date is required.'); return; }
    if (!product) { setError('Please select a product.'); return; }
    setError('');
    // Store as noon UTC on that date so timezone differences don't shift the day
    const [y, m, d] = dateVal.split('-').map(Number);
    const iso = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
    onSave({
      id: event?.id ?? uid(),
      name: name.trim(),
      date: iso,
      product,
      bannerUrl: bannerUrl.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  const previewDate = dateVal ? (() => { const [y,m,d] = dateVal.split('-').map(Number); return new Date(Date.UTC(y,m-1,d,12,0,0)).toISOString(); })() : '';

  return (
    <Modal title={event ? 'Edit Event' : 'Add Event'} onClose={onClose} wide>
      <div className="px-6 py-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
        <div>
          <Label>Event Name</Label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Product Launch Summit 2024" className={FIELD} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Product</Label>
            <select value={product} onChange={e => setProduct(e.target.value)} className={FIELD}>
              {products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} className={FIELD} />
          </div>
        </div>

        <div>
          <Label>Banner <span className="text-[#a89d95] font-normal normal-case tracking-normal">(optional — upload a screenshot or event image)</span></Label>
          <BannerField value={bannerUrl} onChange={setBannerUrl} />
        </div>

        <div>
          <Label>Description <span className="text-[#a89d95] font-normal normal-case tracking-normal">(optional)</span></Label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short description…" className={`${FIELD} resize-none`} />
        </div>

        {previewDate && isUpcoming(previewDate) && (
          <div className="bg-[#f7f4f1] rounded-xl p-4 flex flex-col gap-2">
            <div className="text-[11px] font-semibold text-[#a89d95] uppercase tracking-wider">Countdown preview</div>
            <CountdownTimer date={previewDate} />
          </div>
        )}

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <button onClick={save} className="w-full bg-[#e04e2a] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all">
          {event ? 'Save Changes' : 'Create Event'}
        </button>
      </div>
    </Modal>
  );
};

// ─── File Modals ──────────────────────────────────────────────────────────────

const EditFileModal = ({ file, catalog, onUpdate, onClose }: { file: FileNode; catalog: CatalogData; onUpdate: (c: CatalogData) => void; onClose: () => void }) => {
  const [name, setName] = useState(file.name);
  const [url, setUrl] = useState(file.url);
  const [thumbUrl, setThumbUrl] = useState(file.thumbnailUrl ?? '');
  const [fileType, setFileType] = useState<FileNode['fileType']>(file.fileType);
  const [error, setError] = useState('');
  const save = () => {
    if (!name.trim()) { setError('Name required.'); return; }
    if (!url.trim()) { setError('URL required.'); return; }
    onUpdate(updateFile(catalog, file.id, { name: name.trim(), url: url.trim(), thumbnailUrl: thumbUrl.trim() || undefined, fileType }));
    onClose();
  };
  return (
    <Modal title="Edit File" onClose={onClose}>
      <div className="px-6 py-5 flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto">
        <div><Label>File Name</Label><input type="text" value={name} onChange={e => setName(e.target.value)} className={FIELD} /></div>
        <div><Label>File Type</Label>
          <select value={fileType} onChange={e => setFileType(e.target.value as FileNode['fileType'])} className={FIELD}>
            <option value="image">Image</option><option value="video">Video</option><option value="pdf">PDF</option><option value="other">Other</option>
          </select>
        </div>
        <div><Label>File URL</Label><textarea value={url} onChange={e => setUrl(e.target.value)} rows={3} className={`${FIELD} resize-none font-mono text-[12px]`} /></div>
        <div><Label>Thumbnail URL <span className="text-[#a89d95] font-normal normal-case tracking-normal">(optional)</span></Label>
          <input type="text" value={thumbUrl} onChange={e => setThumbUrl(e.target.value)} placeholder="https://..." className={FIELD} />
        </div>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        <button onClick={save} className="w-full bg-[#e04e2a] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all mt-1">Save Changes</button>
      </div>
    </Modal>
  );
};

const AddFileModal = ({ allFolders, defaultFolderId, onAdd, onClose, defaultTab = 'upload' }: { allFolders: FolderOption[]; defaultFolderId: string; onAdd: (f: FileNode, fId: string) => void; onClose: () => void; defaultTab?: 'link' | 'upload' }) => {
  const [tab, setTab] = useState<'link' | 'upload'>(defaultTab);
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [thumbUrl, setThumbUrl] = useState('');
  const [fileType, setFileType] = useState<FileNode['fileType']>('image'); const [folderId, setFolderId] = useState(defaultFolderId);
  const [linkError, setLinkError] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState(defaultFolderId);
  const [pickedFile, setPickedFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(''); const [uploadDone, setUploadDone] = useState(false); const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLinkAdd = () => {
    if (!name.trim()) { setLinkError('File name required.'); return; }
    if (!url.trim()) { setLinkError('URL required.'); return; }
    setLinkError('');
    onAdd({ id: uid(), name: name.trim(), type: 'file', fileType, url: url.trim(), thumbnailUrl: thumbUrl.trim() || undefined }, folderId);
  };
  const handleUpload = async () => {
    if (!pickedFile) return;
    setUploading(true); setUploadError('');
    try {
      const result: UploadResult = await uploadFileToServer(pickedFile);
      onAdd({ id: uid(), name: result.name, type: 'file', fileType: guessFileType(result.name), url: result.url, thumbnailUrl: result.thumbnailUrl, size: result.size }, uploadFolderId);
      setUploadDone(true); setPickedFile(null);
    } catch (err: unknown) { setUploadError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <Modal title="Add File" onClose={onClose}>
      <div className="flex border-b border-[#e8e4de]">
        {(['link', 'upload'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${tab === t ? 'border-[#e04e2a] text-[#e04e2a]' : 'border-transparent text-[#a89d95] hover:text-[#5a524c]'}`}>
            {t === 'link' ? <LinkIco /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" x2="12" y1="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>}
            {t === 'link' ? 'Paste Link' : 'Upload File'}
          </button>
        ))}
      </div>
      <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
        {tab === 'link' ? (
          <div className="flex flex-col gap-3.5">
            <div><Label>Target Folder</Label><select value={folderId} onChange={e => setFolderId(e.target.value)} className={FIELD}>{allFolders.map(f => <option key={f.id} value={f.id}>{f.path}</option>)}</select></div>
            <div><Label>File Name</Label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. logo-final.png" className={FIELD} /></div>
            <div><Label>File Type</Label><select value={fileType} onChange={e => setFileType(e.target.value as FileNode['fileType'])} className={FIELD}><option value="image">Image</option><option value="video">Video</option><option value="pdf">PDF</option><option value="other">Other</option></select></div>
            <div><Label>File URL <span className="text-[#a89d95] font-normal normal-case tracking-normal">(OneDrive or direct link)</span></Label><textarea value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." rows={2} className={`${FIELD} resize-none font-mono text-[12px]`} /></div>
            <div><Label>Thumbnail URL <span className="text-[#a89d95] font-normal normal-case tracking-normal">(optional)</span></Label><input type="text" value={thumbUrl} onChange={e => setThumbUrl(e.target.value)} placeholder="https://..." className={FIELD} /></div>
            {linkError && <p className="text-[12px] text-red-500">{linkError}</p>}
            <button onClick={handleLinkAdd} className="w-full bg-[#e04e2a] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#c9451f] shadow-sm shadow-[#e04e2a]/20 hover:shadow-md transition-all mt-1">Add File</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div><Label>Target Folder</Label><select value={uploadFolderId} onChange={e => setUploadFolderId(e.target.value)} className={FIELD}>{allFolders.map(f => <option key={f.id} value={f.id}>{f.path}</option>)}</select></div>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setPickedFile(f); setUploadError(''); setUploadDone(false); } }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2.5 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-[#e04e2a] bg-[#fff5f3]' : 'border-[#e0dbd5] bg-[#faf8f6] hover:border-[#c5bdb6]'}`}>
              <UploadCloudIco />
              {pickedFile ? (
                <div className="text-center"><div className="text-[13px] font-medium text-[#1c1a18]">{pickedFile.name}</div><div className="text-[11px] text-[#a89d95]">{(pickedFile.size / 1024).toFixed(0)} KB · click to change</div></div>
              ) : (
                <div className="text-center"><div className="text-[13px] font-medium text-[#1c1a18]">Drop a file or click to browse</div><div className="text-[11px] text-[#a89d95]">Images, videos, PDFs and more</div></div>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPickedFile(f); setUploadError(''); setUploadDone(false); } }} />
            </div>
            {uploadDone && <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-lg border border-green-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg><span className="text-[12px] text-green-700 font-medium">Uploaded!</span></div>}
            {uploadError && <p className="text-[12px] text-red-500">{uploadError}</p>}
            <button onClick={handleUpload} disabled={!pickedFile || uploading} className="w-full bg-[#e04e2a] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#c9451f] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {uploading ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Uploading…</> : 'Upload File'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [catalog, setCatalog] = useState<CatalogData>(initialData);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [appView, setAppView] = useState<'browse' | 'admin' | 'eventFiles'>('browse');
  const [adminInitialTab, setAdminInitialTab] = useState<'catalog' | 'events'>('catalog');
  const [eventFilesEvent, setEventFilesEvent] = useState<EventItem | null>(null);
  const [addModalFolderId, setAddModalFolderId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<FileNode | null>(null);
  const catalogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    setupStorage();
    (async () => {
      try {
        // Load catalog
        const remoteCatalog = await loadCatalog();
        const baseCatalog = remoteCatalog ?? (() => {
          try { const s = localStorage.getItem('mediaCatalog_v1'); return s ? JSON.parse(s) : null; } catch { return null; }
        })() ?? initialData;
        setCatalog(ensureConsultease(baseCatalog));

        // Load events
        const remoteEvents = await loadEvents();
        const baseEvents = remoteEvents ?? (() => {
          try { const s = localStorage.getItem('catalogEvents_v1'); return s ? JSON.parse(s) : null; } catch { return null; }
        })() ?? [];
        setEvents(baseEvents);
      } catch {
        try { const s = localStorage.getItem('mediaCatalog_v1'); if (s) setCatalog(ensureConsultease(JSON.parse(s))); } catch {}
        try { const s = localStorage.getItem('catalogEvents_v1'); if (s) setEvents(JSON.parse(s)); } catch {}
      } finally {
        setLoading(false);
        isFirstMount.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    if (isFirstMount.current) return;
    localStorage.setItem('mediaCatalog_v1', JSON.stringify(catalog));
    if (catalogTimer.current) clearTimeout(catalogTimer.current);
    catalogTimer.current = setTimeout(() => saveCatalog(catalog), 1500);
  }, [catalog]);

  useEffect(() => {
    if (isFirstMount.current) return;
    localStorage.setItem('catalogEvents_v1', JSON.stringify(events));
    if (eventsTimer.current) clearTimeout(eventsTimer.current);
    eventsTimer.current = setTimeout(() => saveEvents(events), 1500);
  }, [events]);

  const root = catalog[0] as FolderNode | undefined;
  // Always start on home (root id), not a product subfolder
  const [selectedId, setSelectedId] = useState(root?.id ?? '');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (root) s.add(root.id);
    return s;
  });

  useEffect(() => {
    if (!loading) {
      const r = catalog[0] as FolderNode | undefined;
      if (r) {
        setSelectedId(r.id); // home page
        setExpandedIds(prev => { const s = new Set(prev); s.add(r.id); return s; });
      }
    }
  }, [loading]);

  const handleToggle = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const handleAddFile = (file: FileNode, folderId: string) => {
    setCatalog(prev => addToFolder(prev, folderId, file));
    setAddModalFolderId(null);
  };
  const isHome = appView === 'browse' && root && selectedId === root.id;
  const selectedFolder = isHome ? null : findFolder(catalog, selectedId);
  const allFolders = getAllFolders(catalog);
  const upcomingCount = events.filter(e => isUpcoming(e.date)).length;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f0ece7]" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="flex items-center gap-3 text-[#a89d95]">
        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        <span className="text-[14px]">Loading…</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar
        catalog={catalog} selectedId={selectedId} expandedIds={expandedIds}
        onSelect={setSelectedId} onToggle={handleToggle}
        appView={appView}
        onToggleAdmin={() => setAppView(v => (v === 'admin' ? 'browse' : 'admin'))}
        onGoHome={() => { setAppView('browse'); setEventFilesEvent(null); }}
        upcomingCount={upcomingCount}
      />

      {appView === 'admin' ? (
        <AdminView
          catalog={catalog} onUpdate={setCatalog}
          events={events} onUpdateEvents={setEvents}
          onAddFile={folderId => setAddModalFolderId(folderId || selectedId)}
          onEditFile={setEditingFile}
          initialTab={adminInitialTab}
        />
      ) : appView === 'eventFiles' && eventFilesEvent ? (
        <EventFilesView
          event={eventFilesEvent}
          onBack={() => { setAppView('browse'); setEventFilesEvent(null); }}
          onUpdateEvent={updated => {
            setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
            setEventFilesEvent(updated);
          }}
        />
      ) : isHome ? (
        <HomeView
          catalog={catalog} events={events}
          onSelect={id => { setSelectedId(id); setExpandedIds(prev => { const s = new Set(prev); s.add(id); return s; }); }}
          onAddFile={() => setAddModalFolderId(selectedId)}
          onAdminEvents={() => { setAdminInitialTab('events'); setAppView('admin'); }}
          onViewEventFiles={e => { setEventFilesEvent(e); setAppView('eventFiles'); }}
        />
      ) : (
        <BrowsePanel
          folder={selectedFolder}
          onSelect={id => { setSelectedId(id); handleToggle(id); }}
          onAddFile={() => setAddModalFolderId(selectedId)}
        />
      )}

      {addModalFolderId !== null && (
        <AddFileModal
          allFolders={allFolders}
          defaultFolderId={addModalFolderId || (allFolders[0]?.id ?? '')}
          defaultTab={addModalFolderId ? 'upload' : 'link'}
          onAdd={handleAddFile}
          onClose={() => setAddModalFolderId(null)}
        />
      )}
      {editingFile && (
        <EditFileModal file={editingFile} catalog={catalog}
          onUpdate={next => { setCatalog(next); setEditingFile(null); }}
          onClose={() => setEditingFile(null)} />
      )}
    </div>
  );
}
