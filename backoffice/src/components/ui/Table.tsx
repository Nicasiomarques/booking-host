import { type JSX, type Component, splitProps, For } from 'solid-js'
import { cn } from '@/lib/utils'

interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  zebra?: boolean
  compact?: boolean
  children: JSX.Element
}

export const Table: Component<TableProps> = (props) => {
  const [local, rest] = splitProps(props, ['zebra', 'compact', 'children', 'class'])

  return (
    <div class="overflow-x-auto">
      <table
        class={cn(
          'table',
          local.zebra && 'table-zebra',
          local.compact && 'table-compact',
          local.class
        )}
        {...rest}
      >
        {local.children}
      </table>
    </div>
  )
}

interface TableHeadProps {
  children: JSX.Element
}

export const TableHead: Component<TableHeadProps> = (props) => {
  return <thead>{props.children}</thead>
}

interface TableBodyProps {
  children: JSX.Element
}

export const TableBody: Component<TableBodyProps> = (props) => {
  return <tbody>{props.children}</tbody>
}

interface TableRowProps extends JSX.HTMLAttributes<HTMLTableRowElement> {
  children: JSX.Element
  hover?: boolean
}

export const TableRow: Component<TableRowProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'hover', 'class'])

  return (
    <tr class={cn(local.hover && 'hover', local.class)} {...rest}>
      {local.children}
    </tr>
  )
}

interface TableCellProps extends JSX.HTMLAttributes<HTMLTableCellElement> {
  children?: JSX.Element
}

export const TableHeader: Component<TableCellProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'class'])

  return (
    <th class={local.class} {...rest}>
      {local.children}
    </th>
  )
}

export const TableCell: Component<TableCellProps> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'class'])

  return (
    <td class={local.class} {...rest}>
      {local.children}
    </td>
  )
}

// Empty state component
interface TableEmptyProps {
  message?: string
  colSpan: number
}

export const TableEmpty: Component<TableEmptyProps> = (props) => {
  return (
    <tr>
      <td colSpan={props.colSpan} class="text-center py-8 text-base-content/60">
        {props.message ?? 'No data available'}
      </td>
    </tr>
  )
}

// Loading skeleton
interface TableSkeletonProps {
  rows?: number
  cols: number
}

export const TableSkeleton: Component<TableSkeletonProps> = (props) => {
  return (
    <For each={Array(props.rows ?? 5).fill(0)}>
      {() => (
        <tr>
          <For each={Array(props.cols).fill(0)}>
            {() => (
              <td>
                <div class="skeleton h-4 w-full" />
              </td>
            )}
          </For>
        </tr>
      )}
    </For>
  )
}
