import type { Component } from 'solid-js'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  class?: string
}

export const Spinner: Component<SpinnerProps> = (props) => {
  const sizeClass = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
  }

  return (
    <span
      class={cn(
        'loading loading-spinner',
        sizeClass[props.size ?? 'md'],
        props.class
      )}
    />
  )
}

interface FullPageSpinnerProps {
  message?: string
}

export const FullPageSpinner: Component<FullPageSpinnerProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center min-h-screen">
      <Spinner size="lg" />
      {props.message && (
        <p class="mt-4 text-base-content/60">{props.message}</p>
      )}
    </div>
  )
}
