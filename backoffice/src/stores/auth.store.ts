import { createSignal, createRoot } from 'solid-js'
import { setAccessToken, getAccessToken } from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

function createAuthStore() {
  const [user, setUser] = createSignal<User | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)

  const isAuthenticated = () => !!getAccessToken() && !!user()

  const login = (userData: User, token: string) => {
    setUser(userData)
    setAccessToken(token)
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
  }

  const hasRole = (establishmentId: string, role: 'OWNER' | 'STAFF') => {
    const currentUser = user()
    if (!currentUser?.establishmentRoles) return false
    return currentUser.establishmentRoles.some(
      (r) => r.establishmentId === establishmentId && r.role === role
    )
  }

  const isOwner = (establishmentId: string) => hasRole(establishmentId, 'OWNER')
  const isStaff = (establishmentId: string) => hasRole(establishmentId, 'STAFF')
  const hasAccess = (establishmentId: string) => isOwner(establishmentId) || isStaff(establishmentId)

  const setLoading = (loading: boolean) => setIsLoading(loading)

  return {
    user,
    setUser,
    isLoading,
    setLoading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    isOwner,
    isStaff,
    hasAccess,
  }
}

export const authStore = createRoot(createAuthStore)
