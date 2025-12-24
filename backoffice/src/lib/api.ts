import { API_BASE_URL } from './constants'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>
}

export class ApiError extends Error {
  public status: number
  public code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) {
    localStorage.setItem('accessToken', token)
  } else {
    localStorage.removeItem('accessToken')
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('accessToken')
  }
  return accessToken
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      setAccessToken(data.accessToken)
      return true
    }
  } catch {
    // Refresh failed
  }
  return false
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // Add headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
  }

  const token = getAccessToken()
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    // Handle 401 - try refresh token
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshed = await refreshToken()
      if (refreshed) {
        // Retry original request with new token
        return request(endpoint, options)
      }
      // Refresh failed - clear token and redirect
      setAccessToken(null)
      window.location.href = '/login'
    }

    throw new ApiError(
      response.status,
      error.error?.code || 'UNKNOWN_ERROR',
      error.error?.message || 'An error occurred'
    )
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) {
    return {} as T
  }

  return JSON.parse(text)
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
}
