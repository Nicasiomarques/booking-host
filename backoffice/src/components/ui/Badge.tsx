import { type JSX, type Component, splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'success' | 'warning' | 'error' | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  outline?: boolean
  children: JSX.Element
}

export const Badge: Component<BadgeProps> = (props) => {
  const [local, rest] = splitProps(props, ['variant', 'size', 'outline', 'children', 'class'])

  const variantClass: Record<string, string> = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    accent: 'badge-accent',
    ghost: 'badge-ghost',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
  }

  const sizeClass: Record<string, string> = {
    xs: 'badge-xs',
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
  }

  return (
    <span
      class={cn(
        'badge',
        variantClass[local.variant ?? 'ghost'],
        sizeClass[local.size ?? 'md'],
        local.outline && 'badge-outline',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </span>
  )
}
