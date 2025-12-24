import { type Component, createSignal, Show } from 'solid-js'
import { z } from 'zod'
import { Button, Input, Textarea, Select } from '@/components/ui'
import type { Establishment } from '../services/establishment.service'

const establishmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  timezone: z.string().min(1, 'Timezone is required'),
})

export type EstablishmentFormData = z.infer<typeof establishmentSchema>

interface EstablishmentFormProps {
  initialData?: Partial<Establishment>
  onSubmit: (data: EstablishmentFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

const TIMEZONES = [
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon (WET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (CET)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Denver', label: 'America/Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao Paulo (BRT)' },
]

export const EstablishmentForm: Component<EstablishmentFormProps> = (props) => {
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [formData, setFormData] = createSignal<Partial<EstablishmentFormData>>({
    name: props.initialData?.name ?? '',
    description: props.initialData?.description ?? '',
    address: props.initialData?.address ?? '',
    timezone: props.initialData?.timezone ?? '',
  })

  const updateField = <K extends keyof EstablishmentFormData>(
    field: K,
    value: EstablishmentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    const result = establishmentSchema.safeParse(formData())

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    await props.onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="form-control">
        <label for="name" class="label">
          <span class="label-text">Name *</span>
        </label>
        <Input
          id="name"
          type="text"
          value={formData().name ?? ''}
          onInput={(e) => updateField('name', e.currentTarget.value)}
          error={!!errors().name}
          placeholder="My Establishment"
        />
        <Show when={errors().name}>
          <span class="label-text-alt text-error">{errors().name}</span>
        </Show>
      </div>

      <div class="form-control">
        <label for="description" class="label">
          <span class="label-text">Description</span>
        </label>
        <Textarea
          id="description"
          value={formData().description ?? ''}
          onInput={(e) => updateField('description', e.currentTarget.value)}
          placeholder="A brief description of your establishment..."
          rows={3}
        />
      </div>

      <div class="form-control">
        <label for="address" class="label">
          <span class="label-text">Address *</span>
        </label>
        <Input
          id="address"
          type="text"
          value={formData().address ?? ''}
          onInput={(e) => updateField('address', e.currentTarget.value)}
          error={!!errors().address}
          placeholder="123 Main St, City, Country"
        />
        <Show when={errors().address}>
          <span class="label-text-alt text-error">{errors().address}</span>
        </Show>
      </div>

      <div class="form-control">
        <label for="timezone" class="label">
          <span class="label-text">Timezone *</span>
        </label>
        <Select
          id="timezone"
          value={formData().timezone ?? ''}
          onChange={(e) => updateField('timezone', e.currentTarget.value)}
          error={!!errors().timezone}
        >
          <option value="">Select timezone</option>
          {TIMEZONES.map(tz => (
            <option value={tz.value}>{tz.label}</option>
          ))}
        </Select>
        <Show when={errors().timezone}>
          <span class="label-text-alt text-error">{errors().timezone}</span>
        </Show>
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={props.onCancel}
          disabled={props.isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={props.isLoading}>
          {props.submitLabel ?? 'Save'}
        </Button>
      </div>
    </form>
  )
}
