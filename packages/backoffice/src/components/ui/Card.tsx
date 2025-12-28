import { type JSX, type Component, splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element
}

export const Card: Component<CardProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'class'])

  return (
    <div class={cn('card bg-base-100 shadow-xl', local.class)} {...rest}>
      {local.children}
    </div>
  )
}

interface CardBodyProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element
}

export const CardBody: Component<CardBodyProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'class'])

  return (
    <div class={cn('card-body', local.class)} {...rest}>
      {local.children}
    </div>
  )
}

interface CardTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  children: JSX.Element
}

export const CardTitle: Component<CardTitleProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'class'])

  return (
    <h2 class={cn('card-title', local.class)} {...rest}>
      {local.children}
    </h2>
  )
}

interface CardActionsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element
  justify?: 'start' | 'end' | 'center'
}

export const CardActions: Component<CardActionsProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'class', 'justify'])

  const justifyClass = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
  }

  return (
    <div class={cn('card-actions', justifyClass[local.justify ?? 'end'], local.class)} {...rest}>
      {local.children}
    </div>
  )
}
