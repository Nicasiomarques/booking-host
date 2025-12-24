import { type Component, createSignal, createEffect, Show } from 'solid-js'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import type { AvailabilitySlot } from '../services/availability.service'

const availabilitySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
}).refine(
  (data) => {
    if (!data.startTime || !data.endTime) return true
    return data.startTime < data.endTime
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
)

export type AvailabilityFormData = z.infer<typeof availabilitySchema>

interface AvailabilityFormProps {
  initialData?: AvailabilitySlot
  onSubmit: (data: AvailabilityFormData) => void
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

export const AvailabilityForm: Component<AvailabilityFormProps> = (props) => {
  const getDefaultDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const [date, setDate] = createSignal(props.initialData?.date ?? getDefaultDate())
  const [startTime, setStartTime] = createSignal(props.initialData?.startTime ?? '09:00')
  const [endTime, setEndTime] = createSignal(props.initialData?.endTime ?? '10:00')
  const [capacity, setCapacity] = createSignal(props.initialData?.capacity?.toString() ?? '1')
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  createEffect(() => {
    if (props.initialData) {
      setDate(props.initialData.date)
      setStartTime(props.initialData.startTime)
      setEndTime(props.initialData.endTime)
      setCapacity(props.initialData.capacity.toString())
    }
  })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      date: date(),
      startTime: startTime(),
      endTime: endTime(),
      capacity: parseInt(capacity()) || 1,
    }

    const result = availabilitySchema.safeParse(formData)
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
        <label for="availability-date" class="label">
          <span class="label-text">Date *</span>
        </label>
        <Input
          id="availability-date"
          type="date"
          value={date()}
          onInput={(e) => setDate(e.currentTarget.value)}
          error={!!errors().date}
        />
        <Show when={errors().date}>
          <span class="label-text-alt text-error">{errors().date}</span>
        </Show>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label for="availability-start-time" class="label">
            <span class="label-text">Start Time *</span>
          </label>
          <Input
            id="availability-start-time"
            type="time"
            value={startTime()}
            onInput={(e) => setStartTime(e.currentTarget.value)}
            error={!!errors().startTime}
          />
          <Show when={errors().startTime}>
            <span class="label-text-alt text-error">{errors().startTime}</span>
          </Show>
        </div>

        <div class="form-control">
          <label for="availability-end-time" class="label">
            <span class="label-text">End Time *</span>
          </label>
          <Input
            id="availability-end-time"
            type="time"
            value={endTime()}
            onInput={(e) => setEndTime(e.currentTarget.value)}
            error={!!errors().endTime}
          />
          <Show when={errors().endTime}>
            <span class="label-text-alt text-error">{errors().endTime}</span>
          </Show>
        </div>
      </div>

      <div class="form-control">
        <label for="availability-capacity" class="label">
          <span class="label-text">Capacity *</span>
        </label>
        <Input
          id="availability-capacity"
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
