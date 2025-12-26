import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import {
  extraItemService,
  type CreateExtraItemData,
  type UpdateExtraItemData,
} from '../services/extra-item.service'
import { toastStore } from '@/hooks/useToast'

export function useExtraItems(serviceId: () => string | undefined) {
  return createQuery(() => {
    const currentId = serviceId()
    return {
      queryKey: ['extra-items', currentId],
      queryFn: () => extraItemService.getByService(currentId!),
      enabled: !!currentId,
    }
  })
}

export function useCreateExtraItem() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: CreateExtraItemData }) =>
      extraItemService.create(serviceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['extra-items', variables.serviceId] })
      toastStore.success('Extra item created successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to create extra item')
    },
  }))
}

export function useUpdateExtraItem() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, serviceId, data }: { id: string; serviceId: string; data: UpdateExtraItemData }) =>
      extraItemService.update(id, data).then((result) => ({ result, serviceId })),
    onSuccess: ({ serviceId }) => {
      queryClient.invalidateQueries({ queryKey: ['extra-items', serviceId] })
      toastStore.success('Extra item updated successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to update extra item')
    },
  }))
}

export function useDeleteExtraItem() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, serviceId }: { id: string; serviceId: string }) =>
      extraItemService.delete(id).then(() => serviceId),
    onSuccess: (serviceId) => {
      queryClient.invalidateQueries({ queryKey: ['extra-items', serviceId] })
      toastStore.success('Extra item deleted successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to delete extra item')
    },
  }))
}
