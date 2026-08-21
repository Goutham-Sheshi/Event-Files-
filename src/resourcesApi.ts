import { supabase } from './lib/supabase'
import type { Resource, ResourceType } from './types'

export type ManagedResource = Resource & {
  storagePath?: string
  created_at?: string
  updated_at?: string
}

export type ResourceInput = {
  title: string
  description?: string | null
  type: ResourceType
  productId: string
  tags?: string[]
  featured?: boolean
}

const STORAGE_BUCKET = 'event-assets'

const safeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

const mapRow = (row: any): ManagedResource => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  type: row.type as ResourceType,
  productId: row.product_id,
  thumbnail: row.thumbnail || undefined,
  sourceUrl: row.source_url,
  storagePath: row.storage_path || undefined,
  fileFormat: row.file_format || undefined,
  fileSize: row.file_size || undefined,
  tags: row.tags || [],
  viewCount: row.view_count || 0,
  downloadCount: row.download_count || 0,
  featured: row.featured || false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function getManagedResources(): Promise<ManagedResource[]> {
  const { data, error } = await supabase.from('vault_resources').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapRow)
}

export async function uploadResource(input: ResourceInput, file: File): Promise<ManagedResource> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : 'FILE'
  const month = new Date().toISOString().slice(0, 7)
  const path = `${input.productId}/${input.type}/${month}/${crypto.randomUUID()}-${safeName(file.name)}`

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined,
  })
  if (uploadError) throw uploadError

  const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const { data, error } = await supabase.from('vault_resources').insert({
    title: input.title || file.name,
    description: input.description || null,
    type: input.type,
    product_id: input.productId,
    source_url: publicData.publicUrl,
    storage_path: path,
    file_format: ext,
    file_size: formatFileSize(file.size),
    tags: input.tags || [],
    featured: input.featured || false,
  }).select().single()

  if (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path])
    throw error
  }
  return mapRow(data)
}

export async function deleteManagedResource(resource: ManagedResource): Promise<void> {
  const { error } = await supabase.from('vault_resources').delete().eq('id', resource.id)
  if (error) throw error
  if (resource.storagePath) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([resource.storagePath])
    if (storageError) throw storageError
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++ }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`
}
