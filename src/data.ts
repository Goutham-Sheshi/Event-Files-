export type FileNode = {
  id: string;
  name: string;
  type: 'file';
  fileType: 'image' | 'video' | 'pdf' | 'other';
  url: string;
  thumbnailUrl?: string;
  size?: string;
};

export type FolderNode = {
  id: string;
  name: string;
  type: 'folder';
  children: (FolderNode | FileNode)[];
};

export type CatalogData = (FolderNode | FileNode)[];

export type EventItem = {
  id: string;
  name: string;
  date: string;       // ISO datetime string
  product: string;    // product name e.g. "Quanta" — badge only, not linked to catalog
  bannerUrl?: string;
  description?: string;
  files?: FileNode[]; // files specific to this event
};

export const catalogData: CatalogData = [
  {
    id: '1',
    name: 'EVENT DATA',
    type: 'folder',
    children: [
      {
        id: '1-1',
        name: 'Quanta',
        type: 'folder',
        children: [
          { id: '1-1-1', name: 'Logo', type: 'folder', children: [
            { id: 'f1', name: 'quanta-logo-main.png', type: 'file', fileType: 'image',
              url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80',
              thumbnailUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&q=80', size: '2.4 MB' }
          ]},
          { id: '1-1-2', name: 'Brochure', type: 'folder', children: [
            { id: 'f2', name: 'Quanta_Q3_Brochure.pdf', type: 'file', fileType: 'pdf', url: '#', size: '4.1 MB' }
          ]},
          { id: '1-1-3', name: 'Videos', type: 'folder', children: [
            { id: 'f3', name: 'Quanta_Promo_720p.mp4', type: 'file', fileType: 'video',
              url: 'https://www.w3schools.com/html/mov_bbb.mp4',
              thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&q=80', size: '45 MB' }
          ]},
          { id: '1-1-4', name: 'Others', type: 'folder', children: [] },
        ],
      },
      {
        id: '1-2',
        name: 'Catalyx',
        type: 'folder',
        children: [
          { id: '1-2-1', name: 'Logo', type: 'folder', children: [
            { id: 'f4', name: 'catalyx-logo.png', type: 'file', fileType: 'image',
              url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
              thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&q=80', size: '1.2 MB' }
          ]},
          { id: '1-2-2', name: 'Brochure', type: 'folder', children: [] },
          { id: '1-2-3', name: 'Videos', type: 'folder', children: [] },
          { id: '1-2-4', name: 'Others', type: 'folder', children: [] },
        ],
      },
      {
        id: '1-3',
        name: 'FR',
        type: 'folder',
        children: [
          { id: '1-3-1', name: 'Logo', type: 'folder', children: [] },
          { id: '1-3-2', name: 'Brochure', type: 'folder', children: [] },
          { id: '1-3-3', name: 'Videos', type: 'folder', children: [] },
          { id: '1-3-4', name: 'Others', type: 'folder', children: [] },
        ],
      },
      {
        id: '1-4',
        name: 'Consultease',
        type: 'folder',
        children: [
          { id: '1-4-1', name: 'Logo', type: 'folder', children: [] },
          { id: '1-4-2', name: 'Brochure', type: 'folder', children: [] },
          { id: '1-4-3', name: 'Videos', type: 'folder', children: [] },
          { id: '1-4-4', name: 'Others', type: 'folder', children: [] },
        ],
      },
    ],
  },
];
