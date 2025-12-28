import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { bookingService, type BookingFilters } from '../services/booking.service'
import { toastStore } from '@/hooks/useToast'

export function useBookings(
  establishmentId: () => string | undefined,
  filters?: () => BookingFilters | undefined,
  page?: () => number,
  limit?: () => number
) {
  return createQuery(() => {
    const currentId = establishmentId()
    const currentFilters = filters?.()
    const currentPage = page?.() ?? 1
    const currentLimit = limit?.() ?? 10
    return {
      queryKey: ['bookings', currentId, currentFilters, currentPage, currentLimit],
      queryFn: () =>
        bookingService.getByEstablishment(
          currentId!,
          currentFilters,
          currentPage,
          currentLimit
        ),
      enabled: !!currentId,
    }
  })
}

export function useBooking(id: () => string | undefined) {
  return createQuery(() => {
    const currentId = id()
    return {
      queryKey: ['booking', currentId],
      queryFn: () => bookingService.getById(currentId!),
      enabled: !!currentId,
    }
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, establishmentId }: { id: string; establishmentId: string }) =>
      bookingService.cancel(id).then((booking) => ({ booking, establishmentId })),
    onSuccess: ({ establishmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', establishmentId] })
      toastStore.success('Booking cancelled successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to cancel booking')
    },
  }))
}

export function useConfirmBooking() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, establishmentId }: { id: string; establishmentId: string }) =>
      bookingService.confirm(id).then((booking) => ({ booking, establishmentId })),
    onSuccess: ({ establishmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', establishmentId] })
      queryClient.invalidateQueries({ queryKey: ['booking'] })
      toastStore.success('Booking confirmed successfully')
    },
    onError: (error: Error) => {
      toastStore.error(error.message || 'Failed to confirm booking')
    },
  }))
}
