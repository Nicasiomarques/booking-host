import { type Component, For } from 'solid-js'
import { Portal } from 'solid-js/web'
import { toastStore, type Toast } from '@/hooks/useToast'

const typeClasses: Record<Toast['type'], string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
}

const typeIcons: Record<Toast['type'], string> = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

export const ToastContainer: Component = () => {
  const { toasts, removeToast } = toastStore

  return (
    <Portal>
      <div class="toast toast-end toast-bottom z-[100]">
        <For each={toasts()}>
          {(toast) => (
            <div class={`alert ${typeClasses[toast.type]} shadow-lg max-w-sm`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d={typeIcons[toast.type]}
                />
              </svg>
              <span class="text-sm">{toast.message}</span>
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                onClick={() => removeToast(toast.id)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  )
}
