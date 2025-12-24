import { type JSX, type Component, Show, createEffect, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: JSX.Element
  size?: 'sm' | 'md' | 'lg'
}

export const Modal: Component<ModalProps> = (props) => {
  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  }

  // Handle escape key
  createEffect(() => {
    if (!props.isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    onCleanup(() => document.removeEventListener('keydown', handleEscape))
  })

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="modal modal-open">
          <div class={`modal-box ${sizeClass[props.size ?? 'md']}`}>
            <button
              type="button"
              class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={props.onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 class="font-bold text-lg mb-4">{props.title}</h3>
            {props.children}
          </div>
          <div class="modal-backdrop bg-black/50" onClick={props.onClose} />
        </div>
      </Portal>
    </Show>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export const ConfirmModal: Component<ConfirmModalProps> = (props) => {
  const variantClass = {
    danger: 'btn-error',
    warning: 'btn-warning',
    info: 'btn-primary',
  }

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={props.title} size="sm">
      <p class="py-4">{props.message}</p>
      <div class="modal-action">
        <button type="button" class="btn btn-ghost" onClick={props.onClose}>
          {props.cancelText ?? 'Cancel'}
        </button>
        <button
          type="button"
          class={`btn ${variantClass[props.variant ?? 'info']}`}
          onClick={props.onConfirm}
          disabled={props.loading}
        >
          {props.loading && <span class="loading loading-spinner loading-sm" />}
          {props.confirmText ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}
