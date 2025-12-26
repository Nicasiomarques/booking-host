import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { QUERY_KEYS } from '@/lib/constants'
import {
  establishmentService,
  type CreateEstablishmentInput,
  type UpdateEstablishmentInput,
} from '../services/establishment.service'

export function useEstablishments() {
  return createQuery(() => ({
    queryKey: [QUERY_KEYS.ESTABLISHMENTS, 'my'],
    queryFn: () => establishmentService.getMyEstablishments(),
  }))
}

export function useEstablishment(id: () => string | undefined) {
  return createQuery(() => {
    const currentId = id()
    return {
      queryKey: [QUERY_KEYS.ESTABLISHMENT, currentId],
      queryFn: () => establishmentService.getById(currentId!),
      enabled: !!currentId,
    }
  })
}

export function useCreateEstablishment() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: (data: CreateEstablishmentInput) =>
      establishmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ESTABLISHMENTS] })
    },
  }))
}

export function useUpdateEstablishment() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, data }: { id: string; data: UpdateEstablishmentInput }) =>
      establishmentService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ESTABLISHMENT, id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ESTABLISHMENTS] })
    },
  }))
}

export function useDeleteEstablishment() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: (id: string) => establishmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ESTABLISHMENTS] })
    },
  }))
}
