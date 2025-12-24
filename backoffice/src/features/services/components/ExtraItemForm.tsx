import { type Component, createSignal, createEffect, Show } from 'solid-js'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import type { ExtraItem } from '../services/extra-item.service'

const extraItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  maxQuantity: z.number().min(1, 'Max quantity must be at least 1'),
})

export type ExtraItemFormData = z.infer<typeof extraItemSchema>

interface ExtraItemFormProps {
  initialData?: ExtraItem
  onSubmit: (data: ExtraItemFormData) => void
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

export const ExtraItemForm: Component<ExtraItemFormProps> = (props) => {
  const [name, setName] = createSignal(props.initialData?.name ?? '')
  const [price, setPrice] = createSignal(props.initialData?.price?.toString() ?? '')
  const [maxQuantity, setMaxQuantity] = createSignal(props.initialData?.maxQuantity?.toString() ?? '1')
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  createEffect(() => {
    if (props.initialData) {
      setName(props.initialData.name)
      setPrice(props.initialData.price.toString())
      setMaxQuantity(props.initialData.maxQuantity.toString())
    }
  })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      name: name(),
      price: parseFloat(price()) || 0,
      maxQuantity: parseInt(maxQuantity()) || 1,
    }

    const result = extraItemSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    props.onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="form-control">
        <label for="extra-name" class="label">
          <span class="label-text">Name *</span>
        </label>
        <Input
          id="extra-name"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="e.g., Extra towel, Premium oil"
          error={!!errors().name}
        />
        <Show when={errors().name}>
          <span class="label-text-alt text-error">{errors().name}</span>
        </Show>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label for="extra-price" class="label">
            <span class="label-text">Price (€) *</span>
          </label>
          <Input
            id="extra-price"
            type="number"
            step="0.01"
            min="0"
            value={price()}
            onInput={(e) => setPrice(e.currentTarget.value)}
            placeholder="0.00"
            error={!!errors().price}
          />
          <Show when={errors().price}>
            <span class="label-text-alt text-error">{errors().price}</span>
          </Show>
        </div>

        <div class="form-control">
          <label for="extra-max-quantity" class="label">
            <span class="label-text">Max Quantity *</span>
          </label>
          <Input
            id="extra-max-quantity"
            type="number"
            min="1"
            value={maxQuantity()}
            onInput={(e) => setMaxQuantity(e.currentTarget.value)}
            placeholder="1"
            error={!!errors().maxQuantity}
          />
          <Show when={errors().maxQuantity}>
            <span class="label-text-alt text-error">{errors().maxQuantity}</span>
          </Show>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={props.isLoading}>
          {props.submitLabel ?? 'Save'}
        </Button>
      </div>
    </form>
  )
}
