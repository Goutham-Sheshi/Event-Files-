// ─── Favorites API Manager ──────────────────────────────────────────────────

const FAVORITES_KEY = 'sheshi-vault-user-favorites'

export function getFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function isFavoriteId(id: string): boolean {
  if (!id) return false
  const list = getFavoriteIds()
  return list.includes(id)
}

export function toggleFavoriteId(id: string): boolean {
  if (!id) return false
  const list = getFavoriteIds()
  const exists = list.includes(id)
  let updated: string[]
  if (exists) {
    updated = list.filter(item => item !== id)
  } else {
    updated = [...list, id]
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Could not persist favorites to localStorage', e)
  }

  window.dispatchEvent(new CustomEvent('vault-favorites-changed', { detail: { id, isFavorite: !exists, favorites: updated } }))
  return !exists
}
