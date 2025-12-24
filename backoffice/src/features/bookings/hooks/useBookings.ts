import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { bookingService, type BookingFilters } from '../services/booking.service'
import { toastStore } from '@/hooks/useToast'

export function useBookings(
  establishmentId: () => string | undefined,
  filters?: () => BookingFilters | undefined,
  page?: () => number,
  limit?: () => number
) {
  return createQuery(() => ({
    queryKey: ['bookings', establishmentId(), filters?.(), page?.(), limit?.()],
    queryFn: () =>
      bookingService.getByEstablishment(
        establishmentId()!,
        filters?.(),
        page?.() ?? 1,
        limit?.() ?? 10
      ),
    enabled: !!establishmentId(),
  }))
}

export function useBooking(id: () => string | undefined) {
  return createQuery(() => ({
    queryKey: ['booking', id()],
    queryFn: () => bookingService.getById(id()!),
    enabled: !!id(),
  }))
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
