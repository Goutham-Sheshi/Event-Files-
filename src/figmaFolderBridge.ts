import { getFigmaResources } from './api';

type FigmaResource = {
  id: string;
  title: string;
  type: string;
  fileName?: string;
  pageName?: string;
  sourceUrl?: string;
};

const TREE_ID = 'figma-folder-tree';
const STYLE_ID = 'figma-folder-tree-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TREE_ID}{margin:2px 0 4px 14px;padding-left:12px;border-left:1px solid var(--line-soft);display:flex;flex-direction:column;gap:2px}
    #${TREE_ID} .fft-row{width:100%;display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:6px;background:transparent;border:0;color:var(--ink-45);font-size:12px;text-align:left;cursor:pointer}
    #${TREE_ID} .fft-row:hover{background:var(--canvas-deep);color:var(--ink)}
    #${TREE_ID} .fft-folder{font-weight:500;color:var(--ink-70)}
    #${TREE_ID} .fft-file{padding-left:18px;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #${TREE_ID} .fft-chevron{width:10px;height:10px;display:inline-flex;align-items:center;justify-content:center;transition:transform .15s;color:var(--ink-45)}
    #${TREE_ID} .fft-group[data-open="false"]>.fft-children{display:none}
    #${TREE_ID} .fft-group[data-open="true"]>.fft-folder .fft-chevron{transform:rotate(90deg)}
    #${TREE_ID} .fft-children{display:flex;flex-direction:column;gap:1px}
    #${TREE_ID} .fft-empty{padding:6px 8px;color:var(--ink-45);font-size:11px}
    .fft-parent-chevron{margin-left:auto;width:12px;height:12px;display:inline-flex;align-items:center;justify-content:center;transition:transform .15s}
    .fft-parent-chevron[data-open="true"]{transform:rotate(90deg)}
  `;
  document.head.appendChild(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(kind: 'folder' | 'file' | 'chevron') {
  const span = document.createElement('span');
  span.innerHTML = kind === 'chevron'
    ? '›'
    : kind === 'folder'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
      : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>';
  return span;
}

function renderTree(resources: FigmaResource[]) {
  const navButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Figma Files');
  if (!navButton || document.getElementById(TREE_ID)) return false;

  const tree = el('div');
  tree.id = TREE_ID;

  const byFile = new Map<string, Map<string, FigmaResource[]>>();
  resources.forEach(resource => {
    const file = resource.fileName || 'Figma File';
    const page = resource.pageName || 'Untitled Page';
    if (!byFile.has(file)) byFile.set(file, new Map());
    const pages = byFile.get(file)!;
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page)!.push(resource);
  });

  if (!byFile.size) {
    tree.appendChild(el('div', 'fft-empty', 'No synced Figma files'));
  }

  byFile.forEach((pages, fileName) => {
    const fileGroup = el('div', 'fft-group');
    fileGroup.dataset.open = 'true';
    const fileButton = el('button', 'fft-row fft-folder');
    const fileChevron = icon('chevron'); fileChevron.className = 'fft-chevron';
    fileButton.append(fileChevron, icon('folder'), document.createTextNode(fileName));
    const pageChildren = el('div', 'fft-children');
    fileButton.onclick = () => { fileGroup.dataset.open = fileGroup.dataset.open === 'true' ? 'false' : 'true'; };

    pages.forEach((frames, pageName) => {
      const pageGroup = el('div', 'fft-group');
      pageGroup.dataset.open = 'true';
      const pageButton = el('button', 'fft-row fft-folder');
      const pageChevron = icon('chevron'); pageChevron.className = 'fft-chevron';
      pageButton.append(pageChevron, icon('folder'), document.createTextNode(pageName));
      const frameChildren = el('div', 'fft-children');
      pageButton.onclick = () => { pageGroup.dataset.open = pageGroup.dataset.open === 'true' ? 'false' : 'true'; };

      frames.forEach(frame => {
        const frameButton = el('button', 'fft-row fft-file');
        frameButton.title = frame.title;
        frameButton.append(icon('file'), document.createTextNode(frame.title));
        frameButton.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (frame.sourceUrl) window.open(frame.sourceUrl, '_blank', 'noopener,noreferrer');
        };
        frameChildren.appendChild(frameButton);
      });

      pageGroup.append(pageButton, frameChildren);
      pageChildren.appendChild(pageGroup);
    });

    fileGroup.append(fileButton, pageChildren);
    tree.appendChild(fileGroup);
  });

  navButton.insertAdjacentElement('afterend', tree);

  const parentChevron = el('span', 'fft-parent-chevron', '›');
  parentChevron.dataset.open = 'true';
  navButton.appendChild(parentChevron);
  navButton.addEventListener('dblclick', event => {
    event.preventDefault();
    const open = tree.style.display !== 'none';
    tree.style.display = open ? 'none' : 'flex';
    parentChevron.dataset.open = open ? 'false' : 'true';
  });
  return true;
}

export function startFigmaFolderBridge() {
  injectStyles();
  let started = false;

  const boot = async () => {
    if (started) return;
    try {
      const { resources } = await getFigmaResources();
      const figma = (resources as FigmaResource[]).filter(resource => resource.type === 'figma');
      if (renderTree(figma)) started = true;
    } catch {
      if (renderTree([])) started = true;
    }
  };

  const observer = new MutationObserver(() => { void boot(); });
  observer.observe(document.body, { childList: true, subtree: true });
  void boot();
}
