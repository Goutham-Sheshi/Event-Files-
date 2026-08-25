const API_BASE = 'http://localhost:4000/api'
const TOKEN_KEY = 'sheshi_jwt_token'

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const customHeaders = options.headers ? (options.headers as Record<string, string>) : undefined
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

export async function backendLogin(email: string, password: string) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data.token) {
    setAuthToken(data.token)
  }
  return data
}

export async function backendRegister(email: string, password: string, fullName?: string) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  })
  if (data.token) {
    setAuthToken(data.token)
  }
  return data
}

export async function backendGetMe() {
  return apiFetch('/auth/me')
}

export async function backendGetUsers() {
  return apiFetch('/users')
}

export async function backendUpdateUserStatus(id: string, status: string) {
  return apiFetch(`/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function backendDeleteUser(id: string) {
  return apiFetch(`/users/${id}`, {
    method: 'DELETE',
  })
}
