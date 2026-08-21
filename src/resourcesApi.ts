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
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i

const safeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

function isImageFile(row: any): boolean {
  const format = String(row.file_format || '').trim().toLowerCase()
  return IMAGE_EXT.test(String(row.source_url || '')) || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(format)
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    for (const key of ['message', 'error_description', 'error', 'details', 'hint']) {
      if (typeof value[key] === 'string' && value[key]) return value[key] as string
    }
    try { return JSON.stringify(error) } catch { /* ignore */ }
  }
  return fallback
}

const mapRow = (row: any): ManagedResource => {
  const sourceUrl = row.source_url || ''
  const thumbnail = row.thumbnail || (isImageFile(row) ? sourceUrl : undefined)

  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    type: row.type as ResourceType,
    productId: row.product_id,
    thumbnail,
    sourceUrl,
    storagePath: row.storage_path || undefined,
    fileFormat: row.file_format || undefined,
    fileSize: row.file_size || undefined,
    tags: row.tags || [],
    viewCount: row.view_count || 0,
    downloadCount: row.download_count || 0,
    featured: row.featured || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getManagedResources(): Promise<ManagedResource[]> {
  const { data, error } = await supabase.from('vault_resources').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Could not load files: ${getErrorMessage(error)}`)
  return (data || []).map(mapRow)
}

export async function uploadResource(input: ResourceInput, file: File): Promise<ManagedResource> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : 'FILE'
  const month = new Date().toISOString().slice(0, 7)
  const path = `${input.productId}/${input.type}/${month}/${crypto.randomUUID()}-${safeName(file.name)}`

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined,
  })
  if (uploadError) throw new Error(`Storage upload failed: ${getErrorMessage(uploadError)}`)

  const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const publicUrl = publicData.publicUrl
  const thumbnail = IMAGE_EXT.test(file.name) || file.type.startsWith('image/') ? publicUrl : null

  const { data, error } = await supabase.from('vault_resources').insert({
    title: input.title || file.name,
    description: input.description || null,
    type: input.type,
    product_id: input.productId,
    source_url: publicUrl,
    thumbnail,
    storage_path: path,
    file_format: ext,
    file_size: formatFileSize(file.size),
    tags: input.tags || [],
    featured: input.featured || false,
  }).select().single()

  if (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path])
    throw new Error(`Database record failed: ${getErrorMessage(error)}`)
  }
  return mapRow(data)
}

export async function deleteManagedResource(resource: ManagedResource): Promise<void> {
  const { error } = await supabase.from('vault_resources').delete().eq('id', resource.id)
  if (error) throw new Error(`Could not delete file record: ${getErrorMessage(error)}`)
  if (resource.storagePath) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([resource.storagePath])
    if (storageError) throw new Error(`Could not delete stored file: ${getErrorMessage(storageError)}`)
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
