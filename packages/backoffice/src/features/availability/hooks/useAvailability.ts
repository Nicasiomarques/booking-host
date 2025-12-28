import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import {
  availabilityService,
  type CreateAvailabilityData,
  type UpdateAvailabilityData,
  type AvailabilityFilters,
} from '../services/availability.service'
import { toastStore } from '@/hooks/useToast'

export function useAvailability(
  serviceId: () => string | undefined,
  filters?: () => AvailabilityFilters | undefined
) {
  return createQuery(() => {
    const currentId = serviceId()
    const currentFilters = filters?.()
    return {
      queryKey: ['availability', currentId, currentFilters],
      queryFn: () => availabilityService.getByService(currentId!, currentFilters),
      enabled: !!currentId,
    }
  })
}

export function useAvailabilitySlot(id: () => string | undefined) {
  return createQuery(() => {
    const currentId = id()
    return {
      queryKey: ['availability-slot', currentId],
      queryFn: () => availabilityService.getById(currentId!),
      enabled: !!currentId,
    }
  })
}

export function useCreateAvailability() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: CreateAvailabilityData }) =>
      availabilityService.create(serviceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.serviceId] })
      toastStore.success('Availability slot created successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to create availability slot')
    },
  }))
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, serviceId, data }: { id: string; serviceId: string; data: UpdateAvailabilityData }) =>
      availabilityService.update(id, data).then((slot) => ({ slot, serviceId })),
    onSuccess: ({ serviceId }) => {
      queryClient.invalidateQueries({ queryKey: ['availability', serviceId] })
      toastStore.success('Availability slot updated successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to update availability slot')
    },
  }))
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, serviceId }: { id: string; serviceId: string }) =>
      availabilityService.delete(id).then(() => serviceId),
    onSuccess: (serviceId) => {
      queryClient.invalidateQueries({ queryKey: ['availability', serviceId] })
      toastStore.success('Availability slot deleted successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to delete availability slot')
    },
  }))
}
