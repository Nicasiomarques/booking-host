import { type Component } from 'solid-js'
import { ConfirmModal } from '@/components/ui'
import type { AvailabilitySlot } from '../services/availability.service'

interface DeleteAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  slot: AvailabilitySlot | null
}

export const DeleteAvailabilityModal: Component<DeleteAvailabilityModalProps> = (props) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <ConfirmModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
      title="Delete Availability Slot"
      message={
        props.slot
          ? `Are you sure you want to delete the availability slot on ${formatDate(props.slot.date)} from ${props.slot.startTime} to ${props.slot.endTime}?`
          : 'Are you sure you want to delete this availability slot?'
      }
      confirmText="Delete"
      variant="danger"
      loading={props.isLoading}
    />
  )
}
