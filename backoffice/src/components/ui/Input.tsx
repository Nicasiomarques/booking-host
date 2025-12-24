import { type JSX, splitProps, type Component } from 'solid-js'
import { cn } from '@/lib/utils'

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ['error', 'class'])

  return (
    <input
      class={cn(
        'input input-bordered w-full',
        local.error && 'input-error',
        local.class
      )}
      {...rest}
    />
  )
}

interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea: Component<TextareaProps> = (props) => {
  const [local, rest] = splitProps(props, ['error', 'class'])

  return (
    <textarea
      class={cn(
        'textarea textarea-bordered w-full',
        local.error && 'textarea-error',
        local.class
      )}
      {...rest}
    />
  )
}

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select: Component<SelectProps> = (props) => {
  const [local, rest] = splitProps(props, ['error', 'class', 'children'])

  return (
    <select
      class={cn(
        'select select-bordered w-full',
        local.error && 'select-error',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </select>
  )
}
