import { type Component, createSignal, createEffect, Show } from 'solid-js'
import { z } from 'zod'
import { Button, Input, Select } from '@/components/ui'
import type { Service } from '../services/service.service'

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Price must be 0 or greater'),
  durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
})

export type ServiceFormData = z.infer<typeof serviceSchema>

interface ServiceFormProps {
  initialData?: Service
  onSubmit: (data: ServiceFormData) => void
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
]

export const ServiceForm: Component<ServiceFormProps> = (props) => {
  const [name, setName] = createSignal(props.initialData?.name ?? '')
  const [description, setDescription] = createSignal(props.initialData?.description ?? '')
  const [basePrice, setBasePrice] = createSignal(props.initialData?.basePrice?.toString() ?? '')
  const [durationMinutes, setDurationMinutes] = createSignal(
    props.initialData?.durationMinutes?.toString() ?? '60'
  )
  const [capacity, setCapacity] = createSignal(props.initialData?.capacity?.toString() ?? '1')
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  createEffect(() => {
    if (props.initialData) {
      setName(props.initialData.name)
      setDescription(props.initialData.description ?? '')
      setBasePrice(props.initialData.basePrice.toString())
      setDurationMinutes(props.initialData.durationMinutes.toString())
      setCapacity(props.initialData.capacity.toString())
    }
  })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      name: name(),
      description: description() || undefined,
      basePrice: parseFloat(basePrice()) || 0,
      durationMinutes: parseInt(durationMinutes()) || 60,
      capacity: parseInt(capacity()) || 1,
    }

    const result = serviceSchema.safeParse(formData)
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
        <label for="service-name" class="label">
          <span class="label-text">Name *</span>
        </label>
        <Input
          id="service-name"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="e.g., Haircut, Massage, Consultation"
          error={!!errors().name}
        />
        <Show when={errors().name}>
          <span class="label-text-alt text-error">{errors().name}</span>
        </Show>
      </div>

      <div class="form-control">
        <label for="service-description" class="label">
          <span class="label-text">Description</span>
        </label>
        <textarea
          id="service-description"
          class="textarea textarea-bordered w-full"
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
          placeholder="Describe the service..."
          rows={3}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="form-control">
          <label for="service-price" class="label">
            <span class="label-text">Base Price (€) *</span>
          </label>
          <Input
            id="service-price"
            type="number"
            step="0.01"
            min="0"
            value={basePrice()}
            onInput={(e) => setBasePrice(e.currentTarget.value)}
            placeholder="0.00"
            error={!!errors().basePrice}
          />
          <Show when={errors().basePrice}>
            <span class="label-text-alt text-error">{errors().basePrice}</span>
          </Show>
        </div>

        <div class="form-control">
          <label for="service-duration" class="label">
            <span class="label-text">Duration *</span>
          </label>
          <Select
            id="service-duration"
            value={durationMinutes()}
            onChange={(e) => setDurationMinutes(e.currentTarget.value)}
            error={!!errors().durationMinutes}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <Show when={errors().durationMinutes}>
            <span class="label-text-alt text-error">{errors().durationMinutes}</span>
          </Show>
        </div>

        <div class="form-control">
          <label for="service-capacity" class="label">
            <span class="label-text">Capacity *</span>
          </label>
          <Input
            id="service-capacity"
            type="number"
            min="1"
            value={capacity()}
            onInput={(e) => setCapacity(e.currentTarget.value)}
            placeholder="1"
            error={!!errors().capacity}
          />
          <Show when={errors().capacity}>
            <span class="label-text-alt text-error">{errors().capacity}</span>
          </Show>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={props.isLoading}>
          {props.submitLabel ?? 'Save'}
        </Button>
      </div>
    </form>
  )
}
