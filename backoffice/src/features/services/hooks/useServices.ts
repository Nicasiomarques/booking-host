import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { serviceService, type CreateServiceData, type UpdateServiceData } from '../services/service.service'
import { toastStore } from '@/hooks/useToast'

export function useServices(establishmentId: () => string | undefined) {
  return createQuery(() => {
    const currentId = establishmentId()
    return {
      queryKey: ['services', currentId],
      queryFn: () => serviceService.getByEstablishment(currentId!),
      enabled: !!currentId,
    }
  })
}

export function useService(id: () => string | undefined) {
  return createQuery(() => {
    const currentId = id()
    return {
      queryKey: ['service', currentId],
      queryFn: () => serviceService.getById(currentId!),
      enabled: !!currentId,
    }
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ establishmentId, data }: { establishmentId: string; data: CreateServiceData }) =>
      serviceService.create(establishmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services', variables.establishmentId] })
      toastStore.success('Service created successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to create service')
    },
  }))
}

export function useUpdateService() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceData }) =>
      serviceService.update(id, data),
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: ['services', service.establishmentId] })
      queryClient.invalidateQueries({ queryKey: ['service', service.id] })
      toastStore.success('Service updated successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to update service')
    },
  }))
}

export function useDeleteService() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, establishmentId }: { id: string; establishmentId: string }) =>
      serviceService.delete(id).then(() => establishmentId),
    onSuccess: (establishmentId) => {
      queryClient.invalidateQueries({ queryKey: ['services', establishmentId] })
      toastStore.success('Service deleted successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to delete service')
    },
  }))
}
