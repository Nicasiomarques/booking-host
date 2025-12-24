import { type Component, type ParentProps, Show, createEffect, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { authStore } from '@/stores'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/api'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { FullPageSpinner } from '@/components/ui'

interface UserResponse {
  id: string
  email: string
  name: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

export const MainLayout: Component<ParentProps> = (props) => {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, setLoading, setUser, logout } = authStore

  // Check auth on mount
  onMount(async () => {
    const token = getAccessToken()

    if (!token) {
      setLoading(false)
      navigate('/login', { replace: true })
      return
    }

    // If we already have user data (from login), skip fetch
    if (user()) {
      setLoading(false)
      return
    }

    // Fetch user data using access token
    try {
      const userData = await api.get<UserResponse>('/v1/auth/me')
      setUser(userData)
    } catch {
      logout()
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  })

  // Redirect if not authenticated after loading
  createEffect(() => {
    if (!isLoading() && !isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  })

  return (
    <Show when={!isLoading()} fallback={<FullPageSpinner message="Loading..." />}>
      <Show when={isAuthenticated()}>
        <div class="flex h-screen bg-base-200">
          <Sidebar />
          <div class="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main class="flex-1 overflow-y-auto p-6">
              {props.children}
            </main>
          </div>
        </div>
      </Show>
    </Show>
  )
}

export default MainLayout
