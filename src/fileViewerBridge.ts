import { updateManagedResourceTags, updateManagedResourceType, updateManagedResourceMeta } from './resourcesApi';
import type { ContentStatus, ResourceType } from './types';
import { triggerDirectDownload } from './utils';
import { isFavoriteId, toggleFavoriteId } from './favoritesApi';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;
const PDF_EXT = /\.pdf(?:[?#].*)?$/i;

const FILE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'logo', label: 'Brand Asset' },
  { value: 'brochure', label: 'Brochure' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
];

const STATUS_TYPES: { value: ContentStatus; label: string; badge: string; color: string }[] = [
  { value: 'Active', label: 'Active', badge: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Official', label: 'Official ✓', badge: 'Official ✓', color: 'bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/40' },
  { value: 'Archived', label: 'Archived', badge: 'Archived', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  { value: 'Deprecated', label: 'Deprecated ⚠️', badge: 'Deprecated ⚠️', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

function fileNameFromUrl(url: string) { try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'File'); } catch { return 'File'; } }

const metadataCache = new Map<string, { tags?: string[]; description?: string; type?: ResourceType; contentStatus?: ContentStatus; version?: string }>();

let activeFlushSave: (() => Promise<void>) | null = null;

function closeViewer() {
  if (activeFlushSave) {
    activeFlushSave();
    activeFlushSave = null;
  }
  document.getElementById('vault-file-viewer')?.remove();
  document.body.style.overflow = '';
}

export function openViewer(
  url: string,
  title: string,
  resourceId?: string,
  initialTags: string[] = [],
  initialType: ResourceType = 'other',
  initialDescription: string = '',
  initialContentStatus: ContentStatus = 'Active',
  initialVersion: string = 'v1.0'
) {
  closeViewer();
  document.body.style.overflow = 'hidden';

  const cached = resourceId ? metadataCache.get(resourceId) : undefined;
  const effectiveTags = cached?.tags ?? initialTags;
  const effectiveType = cached?.type ?? initialType;
  const effectiveDescription = cached?.description ?? initialDescription;
  const effectiveStatus = cached?.contentStatus ?? initialContentStatus;
  const effectiveVersion = cached?.version ?? initialVersion;

  const modal = document.createElement('div');
  modal.id = 'vault-file-viewer';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,18,24,.72);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(1100px,96vw);height:min(860px,94vh);background:var(--paper);border-radius:18px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;border:1px solid var(--line-soft);';

  // ─── Header ─────────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.style.cssText = 'height:64px;flex:none;padding:0 20px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;justify-content:space-between;gap:16px;font-family:Inter,system-ui,sans-serif;background:var(--paper);';
  
  const headerLeft = document.createElement('div');
  headerLeft.style.cssText = 'display:flex;align-items:center;gap:10px;min-width:0;';
  
  const name = document.createElement('div');
  name.textContent = title || fileNameFromUrl(url);
  name.style.cssText = 'font-size:14px;font-weight:650;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  
  const statusBadge = document.createElement('span');
  const matchedStatus = STATUS_TYPES.find(s => s.value === effectiveStatus) || STATUS_TYPES[0];
  statusBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border ${matchedStatus.color}`;
  statusBadge.textContent = matchedStatus.badge;

  const versionBadge = document.createElement('span');
  versionBadge.className = 'px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 font-mono text-[10px] font-bold border border-slate-600/40';
  versionBadge.textContent = effectiveVersion;

  headerLeft.append(name, statusBadge, versionBadge);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;align-items:center;gap:8px;flex:none;';
  const isVideoType = effectiveType === 'video' || VIDEO_EXT.test(url);
  const actionText = isVideoType ? 'Watch Video' : 'Download';
  const download = document.createElement('button');
  download.type = 'button';
  download.textContent = actionText;
  download.style.cssText = 'border:0;background:var(--primary);color:#fff;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:650;cursor:pointer;transition:opacity 0.2s;';
  download.onclick = async (e) => {
    e.preventDefault();
    if (isVideoType && !VIDEO_EXT.test(url)) {
      window.open(url, '_blank', 'noreferrer');
    } else {
      const prevText = download.textContent;
      download.textContent = 'Downloading…';
      download.style.opacity = '0.7';
      try { await triggerDirectDownload(url, title); } finally { download.textContent = prevText; download.style.opacity = '1'; }
    }
  };
  const favoriteBtn = document.createElement('button');
  favoriteBtn.type = 'button';
  const isFav = resourceId ? isFavoriteId(resourceId) : false;
  favoriteBtn.textContent = isFav ? '★ Favorited' : '☆ Favorite';
  favoriteBtn.style.cssText = `border:1px solid var(--line-soft);background:${isFav ? 'var(--primary-soft)' : 'var(--paper)'};color:${isFav ? 'var(--primary)' : 'var(--ink-70)'};border-radius:8px;padding:9px 12px;font-size:12px;font-weight:650;cursor:pointer;`;
  favoriteBtn.onclick = () => {
    if (!resourceId) return;
    const nowFav = toggleFavoriteId(resourceId);
    favoriteBtn.textContent = nowFav ? '★ Favorited' : '☆ Favorite';
    favoriteBtn.style.background = nowFav ? 'var(--primary-soft)' : 'var(--paper)';
    favoriteBtn.style.color = nowFav ? 'var(--primary)' : 'var(--ink-70)';
  };

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close viewer');
  close.style.cssText = 'border:0;background:var(--line);color:var(--ink);border-radius:8px;width:34px;height:34px;font-size:24px;line-height:1;cursor:pointer;';
  close.onclick = closeViewer;
  actions.append(favoriteBtn, download, close);
  header.append(headerLeft, actions);

  // ─── Meta bar (type + status + tags + description) ──────────────────────────
  const metaBar = document.createElement('div');
  metaBar.style.cssText = 'flex:none;padding:12px 20px;border-bottom:1px solid var(--line-soft);background:var(--canvas-deep);font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:8px;';

  // Row 1: file type + content status + tags
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

  const typeLabel = document.createElement('span');
  typeLabel.textContent = 'Type';
  typeLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--ink-45);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;';
  const typeSelect = document.createElement('select');
  typeSelect.disabled = !resourceId;
  typeSelect.style.cssText = 'width:130px;border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--ink);outline:none;background:var(--paper);';
  FILE_TYPES.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    el.selected = option.value === effectiveType;
    typeSelect.appendChild(el);
  });

  const statusLabel = document.createElement('span');
  statusLabel.textContent = 'Status';
  statusLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--ink-45);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;margin-left:4px;';
  const statusSelect = document.createElement('select');
  statusSelect.disabled = !resourceId;
  statusSelect.style.cssText = 'width:130px;border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--ink);outline:none;background:var(--paper);';
  STATUS_TYPES.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    el.selected = option.value === effectiveStatus;
    statusSelect.appendChild(el);
  });

  const sep = document.createElement('span');
  sep.textContent = '|';
  sep.style.cssText = 'color:var(--line-soft);';

  const tagLabel = document.createElement('span');
  tagLabel.textContent = 'Tags';
  tagLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--ink-45);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;';
  const tagInput = document.createElement('input');
  tagInput.value = effectiveTags.join(', ');
  tagInput.placeholder = 'Story, Brand, 2026…';
  tagInput.disabled = !resourceId;
  tagInput.style.cssText = 'flex:1;min-width:160px;border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--ink);outline:none;background:var(--paper);';

  const saveStatus = document.createElement('span');
  saveStatus.style.cssText = 'font-size:11px;color:var(--ink-45);white-space:nowrap;min-width:60px;';
  saveStatus.textContent = resourceId ? 'Auto-save' : '';

  const manualSaveBtn = document.createElement('button');
  manualSaveBtn.type = 'button';
  manualSaveBtn.textContent = 'Save Changes';
  manualSaveBtn.disabled = !resourceId;
  manualSaveBtn.style.cssText = 'border:1px solid var(--line-soft);background:var(--paper);color:var(--ink);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;display:none;';

  row1.append(typeLabel, typeSelect, statusLabel, statusSelect, sep, tagLabel, tagInput, saveStatus, manualSaveBtn);

  // Row 2: description
  const row2 = document.createElement('div');
  row2.style.cssText = 'display:flex;align-items:flex-start;gap:10px;';
  const descLabel = document.createElement('span');
  descLabel.textContent = 'Description';
  descLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--ink-45);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;padding-top:7px;';
  const descInput = document.createElement('textarea');
  descInput.value = effectiveDescription || '';
  descInput.placeholder = 'Add a short description for this file…';
  descInput.disabled = !resourceId;
  descInput.rows = 2;
  descInput.style.cssText = 'flex:1;border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--ink);outline:none;background:var(--paper);resize:vertical;font-family:Inter,system-ui,sans-serif;line-height:1.5;';
  row2.append(descLabel, descInput);

  metaBar.append(row1, row2);

  // ─── Auto-save & Manual-save logic ─────────────────────────────────────────
  let lastSavedTags = tagInput.value;
  let lastSavedDesc = descInput.value;
  let lastSavedStatus = statusSelect.value;
  let savingTimer: number | undefined;

  const saveAll = async () => {
    if (!resourceId) return;
    const nextTags = tagInput.value.trim();
    const nextDesc = descInput.value.trim();
    const nextStatus = statusSelect.value as ContentStatus;
    if (nextTags === lastSavedTags && nextDesc === lastSavedDesc && nextStatus === lastSavedStatus) return;
    
    saveStatus.textContent = 'Saving…';
    manualSaveBtn.disabled = true;

    try {
      const updates: { tags?: string[]; description?: string | null; contentStatus?: ContentStatus } = {};
      const parsedTags = nextTags.split(',').map(t => t.trim()).filter(Boolean);
      if (nextTags !== lastSavedTags) updates.tags = parsedTags;
      if (nextDesc !== lastSavedDesc) updates.description = nextDesc || null;
      if (nextStatus !== lastSavedStatus) updates.contentStatus = nextStatus;
      
      await updateManagedResourceMeta(resourceId, updates);
      
      lastSavedTags = nextTags;
      lastSavedDesc = nextDesc;
      lastSavedStatus = nextStatus;
      saveStatus.textContent = 'Saved ✓';
      manualSaveBtn.style.display = 'none';

      // Update Header Badge
      const updatedMatch = STATUS_TYPES.find(s => s.value === nextStatus) || STATUS_TYPES[0];
      statusBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border ${updatedMatch.color}`;
      statusBadge.textContent = updatedMatch.badge;

      // Store in memory cache immediately
      const prevCached = metadataCache.get(resourceId) || {};
      metadataCache.set(resourceId, {
        ...prevCached,
        description: nextDesc,
        tags: parsedTags,
        contentStatus: nextStatus,
      });

      // Update card attributes in DOM if card exists
      const cardEl = document.querySelector(`[data-resource-id="${resourceId}"]`);
      if (cardEl) {
        if (updates.description !== undefined) cardEl.setAttribute('data-resource-description', nextDesc);
        if (updates.tags !== undefined) cardEl.setAttribute('data-resource-tags', JSON.stringify(parsedTags));
      }

      window.dispatchEvent(new CustomEvent('vault-resources-changed', {
        detail: { id: resourceId, tags: updates.tags, description: updates.description, contentStatus: nextStatus }
      }));
      
      setTimeout(() => { if (saveStatus.textContent === 'Saved ✓') saveStatus.textContent = 'Auto-save'; }, 1500);
    } catch (error) {
      console.error(error);
      saveStatus.textContent = 'Save failed';
      manualSaveBtn.disabled = false;
    }
  };

  activeFlushSave = saveAll;
  manualSaveBtn.onclick = () => { saveAll(); };

  const schedSave = () => {
    const isDirty = tagInput.value.trim() !== lastSavedTags || descInput.value.trim() !== lastSavedDesc || statusSelect.value !== lastSavedStatus;
    if (isDirty) {
      manualSaveBtn.style.display = 'inline-block';
      manualSaveBtn.disabled = false;
    }
    if (savingTimer) window.clearTimeout(savingTimer);
    savingTimer = window.setTimeout(saveAll, 700);
  };

  tagInput.addEventListener('input', schedSave);
  tagInput.addEventListener('blur', () => { if (savingTimer) window.clearTimeout(savingTimer); saveAll(); });
  tagInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (savingTimer) window.clearTimeout(savingTimer); saveAll(); } });
  descInput.addEventListener('input', schedSave);
  descInput.addEventListener('blur', () => { if (savingTimer) window.clearTimeout(savingTimer); saveAll(); });
  statusSelect.addEventListener('change', schedSave);

  const saveType = async () => {
    if (!resourceId) return;
    try {
      const nextType = typeSelect.value as ResourceType;
      await updateManagedResourceType(resourceId, nextType);
      const prevCached = metadataCache.get(resourceId) || {};
      metadataCache.set(resourceId, { ...prevCached, type: nextType });
      window.dispatchEvent(new CustomEvent('vault-resources-changed', { detail: { id: resourceId, type: nextType } }));
    } catch (error) {
      console.error(error);
    }
  };
  typeSelect.addEventListener('change', saveType);

  // ─── Content area ────────────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.style.cssText = 'flex:1;min-height:0;background:var(--canvas-deep);display:flex;align-items:center;justify-content:center;padding:18px;';
  if (IMAGE_EXT.test(url)) {
    const image = document.createElement('img'); image.src = url; image.alt = title;
    image.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 8px 28px rgba(0,0,0,.6);';
    content.appendChild(image);
  } else if (VIDEO_EXT.test(url)) {
    const video = document.createElement('video'); video.src = url; video.controls = true;
    video.style.cssText = 'max-width:100%;max-height:100%;width:100%;height:auto;background:#111;border-radius:10px;';
    content.appendChild(video);
  } else if (PDF_EXT.test(url)) {
    const frame = document.createElement('iframe'); frame.src = url; frame.title = title;
    frame.style.cssText = 'width:100%;height:100%;border:0;background:var(--paper);border-radius:8px;';
    content.style.padding = '0';
    content.appendChild(frame);
  } else if (isVideoType) {
    const box = document.createElement('div');
    box.style.cssText = 'text-align:center;font-family:Inter,system-ui,sans-serif;color:var(--ink-70);background:var(--paper);border:1px solid var(--line-soft);padding:32px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.3);max-width:400px;width:90%;';
    box.innerHTML = '<div style="font-size:32px;margin-bottom:16px;">🎬</div><div style="font-size:16px;font-weight:650;color:var(--ink);margin-bottom:8px">Watch External Video</div><div style="font-size:13px;margin-bottom:20px;line-height:1.5;">This video is hosted externally. Click below to watch it in a new tab.</div><a href="' + url + '" target="_blank" rel="noreferrer" style="display:inline-block;text-decoration:none;background:var(--primary);color:#fff;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:650;">Watch Video</a>';
    content.appendChild(box);
  } else {
    const message = document.createElement('div');
    message.style.cssText = 'text-align:center;font-family:Inter,system-ui,sans-serif;color:var(--ink-70);';
    message.innerHTML = '<div style="font-size:16px;font-weight:650;color:var(--ink);margin-bottom:8px">Preview unavailable</div><div style="font-size:13px">This file type cannot be previewed in the browser. Use Download to open it.</div>';
    content.appendChild(message);
  }

  panel.append(header, metaBar, content);
  modal.appendChild(panel);
  modal.addEventListener('click', e => { if (e.target === modal) closeViewer(); });
  document.body.appendChild(modal);
}

export function startFileViewerBridge() {
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('#vault-file-viewer')) return;
    const card = target.closest<HTMLElement>('.group');
    if (!card) return;
    const link = card.querySelector<HTMLAnchorElement>('a[href]');
    if (!link?.href || !/^https?:/i.test(link.href)) return;
    const title = card.querySelector('.line-clamp-2')?.textContent?.trim() || link.textContent?.trim() || fileNameFromUrl(link.href);
    const isDownloadClick = target.closest('a') === link || target === link;
    if (isDownloadClick) {
      const isVideo = (link.textContent || '').toLowerCase().includes('video');
      if (!isVideo) { event.preventDefault(); event.stopPropagation(); triggerDirectDownload(link.href, title); }
      return;
    }
    const label = (link.textContent || '').toLowerCase();
    const isFigma = label.includes('figma') || /figma\.com/i.test(link.href);
    if (isFigma) return;
    const looksLikeResource = !!card.querySelector('img,svg');
    if (!looksLikeResource) return;
    event.preventDefault();
    event.stopPropagation();

    const resourceId = card.getAttribute('data-resource-id') || undefined;
    const cached = resourceId ? metadataCache.get(resourceId) : undefined;

    openViewer(
      link.href,
      title,
      resourceId,
      cached?.tags ?? JSON.parse(card.getAttribute('data-resource-tags') || '[]'),
      cached?.type ?? ((card.getAttribute('data-resource-type') || 'other') as ResourceType),
      cached?.description ?? (card.getAttribute('data-resource-description') || ''),
      cached?.contentStatus ?? 'Active',
      cached?.version ?? 'v1.0'
    );
  }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeViewer(); });
}
