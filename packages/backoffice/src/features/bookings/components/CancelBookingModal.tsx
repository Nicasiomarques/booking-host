import { type Component } from 'solid-js'
import { ConfirmModal } from '@/components/ui'
import type { Booking } from '../services/booking.service'

interface CancelBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  booking: Booking | null
}

export const CancelBookingModal: Component<CancelBookingModalProps> = (props) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <ConfirmModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
      title="Cancel Booking"
      message={
        props.booking
          ? `Are you sure you want to cancel the booking for ${props.booking.customerName} on ${formatDate(props.booking.date)}? This action cannot be undone.`
          : 'Are you sure you want to cancel this booking?'
      }
      confirmText="Cancel Booking"
      variant="danger"
      loading={props.isLoading}
    />
  )
}
