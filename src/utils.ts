import type { CatalogData, FolderNode, FileNode } from './data';

export type FolderOption = { id: string; path: string };
export type FileWithPath = FileNode & { folderPath: string; folderId: string };

export function getAllFolders(nodes: CatalogData, acc: FolderOption[] = [], prefix = ''): FolderOption[] {
  for (const n of nodes) {
    if (n.type !== 'folder') continue;
    const path = prefix ? `${prefix} › ${n.name}` : n.name;
    acc.push({ id: n.id, path });
    getAllFolders(n.children, acc, path);
  }
  return acc;
}

export function getAllFiles(nodes: CatalogData, acc: FileWithPath[] = [], prefix = '', folderId = ''): FileWithPath[] {
  for (const n of nodes) {
    if (n.type === 'file') {
      acc.push({ ...n, folderPath: prefix, folderId });
    } else {
      const path = prefix ? `${prefix} › ${n.name}` : n.name;
      getAllFiles(n.children, acc, path, n.id);
    }
  }
  return acc;
}

export function findFolder(nodes: CatalogData, id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.type === 'folder') {
      if (n.id === id) return n;
      const f = findFolder(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export function findPath(nodes: CatalogData, id: string, trail: FolderNode[] = []): FolderNode[] | null {
  for (const n of nodes) {
    if (n.type !== 'folder') continue;
    const nextTrail = [...trail, n];
    if (n.id === id) return nextTrail;
    const found = findPath(n.children, id, nextTrail);
    if (found) return found;
  }
  return null;
}

export function addToFolder(nodes: CatalogData, folderId: string, item: FileNode | FolderNode): CatalogData {
  return nodes.map((n): FolderNode | FileNode => {
    if (n.type !== 'folder') return n;
    if (n.id === folderId) return { ...n, children: [...n.children, item] };
    return { ...n, children: addToFolder(n.children, folderId, item) };
  });
}

export function deleteFromTree(nodes: CatalogData, id: string): CatalogData {
  return nodes
    .filter(n => n.id !== id)
    .map(n => n.type === 'folder' ? { ...n, children: deleteFromTree(n.children, id) } : n);
}

export function updateFile(nodes: CatalogData, id: string, patch: Partial<FileNode>): CatalogData {
  return nodes.map(n => {
    if (n.type === 'file' && n.id === id) return { ...n, ...patch };
    if (n.type === 'folder') return { ...n, children: updateFile(n.children, id, patch) };
    return n;
  });
}

export function updateFolderName(nodes: CatalogData, id: string, name: string): CatalogData {
  return nodes.map(n => {
    if (n.type !== 'folder') return n;
    if (n.id === id) return { ...n, name };
    return { ...n, children: updateFolderName(n.children, id, name) };
  });
}

export function uid(): string {
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function guessFileType(fileName: string): FileNode['fileType'] {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}
