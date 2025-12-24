import { type Component } from 'solid-js'
import { ConfirmModal } from '@/components/ui'
import type { Service } from '../services/service.service'

interface DeleteServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  service: Service | null
}

export const DeleteServiceModal: Component<DeleteServiceModalProps> = (props) => {
  return (
    <ConfirmModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onConfirm={props.onConfirm}
      title="Delete Service"
      message={`Are you sure you want to delete "${props.service?.name}"? This action cannot be undone.`}
      confirmText="Delete"
      variant="danger"
      loading={props.isLoading}
    />
  )
}
