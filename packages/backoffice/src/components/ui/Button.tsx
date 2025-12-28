import { type JSX, splitProps, type Component } from 'solid-js'
import { cn } from '@/lib/utils'

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'error'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['variant', 'size', 'loading', 'children', 'class', 'disabled'])

  const variants: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
    error: 'btn-error',
  }

  const sizes: Record<string, string> = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }

  return (
    <button
      class={cn(
        'btn',
        variants[local.variant ?? 'primary'],
        sizes[local.size ?? 'md'],
        local.class
      )}
      disabled={local.loading || local.disabled}
      {...rest}
    >
      {local.loading && <span class="loading loading-spinner loading-sm" />}
      {local.children}
    </button>
  )
}
