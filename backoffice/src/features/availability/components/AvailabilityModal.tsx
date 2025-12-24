import { type Component } from 'solid-js'
import { Modal } from '@/components/ui'
import { AvailabilityForm, type AvailabilityFormData } from './AvailabilityForm'
import type { AvailabilitySlot } from '../services/availability.service'

interface AvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AvailabilityFormData) => void
  isLoading?: boolean
  slot?: AvailabilitySlot
  mode: 'create' | 'edit'
}

export const AvailabilityModal: Component<AvailabilityModalProps> = (props) => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.mode === 'create' ? 'Create Availability Slot' : 'Edit Availability Slot'}
    >
      <AvailabilityForm
        initialData={props.slot}
        onSubmit={props.onSubmit}
        onCancel={props.onClose}
        isLoading={props.isLoading}
        submitLabel={props.mode === 'create' ? 'Create' : 'Save Changes'}
      />
    </Modal>
  )
}

interface CreateAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AvailabilityFormData) => void
  isLoading?: boolean
}

export const CreateAvailabilityModal: Component<CreateAvailabilityModalProps> = (props) => {
  return (
    <AvailabilityModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      isLoading={props.isLoading}
      mode="create"
    />
  )
}

interface EditAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AvailabilityFormData) => void
  isLoading?: boolean
  slot: AvailabilitySlot
}

export const EditAvailabilityModal: Component<EditAvailabilityModalProps> = (props) => {
  return (
    <AvailabilityModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      isLoading={props.isLoading}
      slot={props.slot}
      mode="edit"
    />
  )
}
