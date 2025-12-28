import { createSignal, createRoot } from 'solid-js'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

function createToastStore() {
  const [toasts, setToasts] = createSignal<Toast[]>([])
  let nextId = 0

  const addToast = (message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const success = (message: string, duration?: number) => addToast(message, 'success', duration)
  const error = (message: string, duration?: number) => addToast(message, 'error', duration)
  const warning = (message: string, duration?: number) => addToast(message, 'warning', duration)
  const info = (message: string, duration?: number) => addToast(message, 'info', duration)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}

export const toastStore = createRoot(createToastStore)

export function useToast() {
  return toastStore
}
