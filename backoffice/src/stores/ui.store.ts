import { createSignal, createRoot, createEffect } from 'solid-js'

type Theme = 'light' | 'dark' | 'corporate'

function createUiStore() {
  const [theme, setTheme] = createSignal<Theme>(
    (localStorage.getItem('theme') as Theme) || 'light'
  )
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false)

  // Sync theme with DOM
  createEffect(() => {
    document.documentElement.setAttribute('data-theme', theme())
    localStorage.setItem('theme', theme())
  })

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  return {
    theme,
    setTheme,
    toggleTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  }
}

export const uiStore = createRoot(createUiStore)
