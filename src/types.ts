// ─── BrandHub data model ────────────────────────────────────────────────────

export type ProductSlug = 'quanta' | 'catalyx' | 'fr' | 'consultease' | 'sheshi';

export type Product = { id: string; name: string; slug: ProductSlug; description: string; color: string; light: string };

export type ResourceType = 'logo' | 'brochure' | 'video' | 'document' | 'other';

export type Resource = {
  id: string; title: string; description?: string; type: ResourceType; productId: string;
  thumbnail?: string; sourceUrl: string; fileFormat?: string; fileSize?: string; tags?: string[];
  viewCount: number; downloadCount: number; featured?: boolean; createdAt: string; updatedAt?: string;
};

export type EventItem = { id: string; title: string; description?: string; date: string; location?: string; productId?: string; banner?: string };

// Canonical roles are admin, advanced and standard. teammate/user remain only for legacy records.
export type UserRole = 'admin' | 'advanced' | 'standard' | 'teammate' | 'user';

export type AppUser = { id: string; name: string; email: string; role: UserRole; status: 'active' | 'invited'; lastActive?: string };
