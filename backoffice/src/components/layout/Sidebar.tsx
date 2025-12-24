import { type Component, For, Show } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { uiStore } from '@/stores'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Establishments', href: '/establishments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
]

export const Sidebar: Component = () => {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = uiStore

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      <Show when={!sidebarCollapsed()}>
        <div
          class="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      </Show>

      {/* Sidebar */}
      <aside
        class={cn(
          'fixed lg:static inset-y-0 left-0 z-50',
          'w-64 bg-base-200 flex flex-col',
          'transform transition-transform duration-200 ease-in-out',
          'lg:transform-none',
          sidebarCollapsed() ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0'
        )}
      >
        {/* Logo */}
        <div class="flex items-center justify-between h-16 px-4 border-b border-base-300">
          <Show when={!sidebarCollapsed()} fallback={<span class="text-xl font-bold">B</span>}>
            <span class="text-xl font-bold">Booking</span>
          </Show>
          <button
            type="button"
            class="btn btn-ghost btn-sm hidden lg:flex"
            onClick={toggleSidebar}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <Show when={sidebarCollapsed()} fallback={
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              }>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </Show>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav class="flex-1 overflow-y-auto py-4">
          <ul class="menu px-2 gap-1">
            <For each={navItems}>
              {(item) => (
                <li>
                  <A
                    href={item.href}
                    class={cn(
                      'flex items-center gap-3',
                      isActive(item.href) && 'active'
                    )}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        toggleSidebar()
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                    </svg>
                    <Show when={!sidebarCollapsed()}>
                      <span>{item.label}</span>
                    </Show>
                  </A>
                </li>
              )}
            </For>
          </ul>
        </nav>
      </aside>
    </>
  )
}
