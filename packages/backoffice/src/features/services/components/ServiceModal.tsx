import { type Component } from 'solid-js'
import { Modal } from '@/components/ui'
import { ServiceForm, type ServiceFormData } from './ServiceForm'
import type { Service } from '../services/service.service'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ServiceFormData) => void
  isLoading?: boolean
  service?: Service
  mode: 'create' | 'edit'
}

export const ServiceModal: Component<ServiceModalProps> = (props) => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.mode === 'create' ? 'Create Service' : 'Edit Service'}
    >
      <ServiceForm
        initialData={props.service}
        onSubmit={props.onSubmit}
        onCancel={props.onClose}
        isLoading={props.isLoading}
        submitLabel={props.mode === 'create' ? 'Create' : 'Save Changes'}
      />
    </Modal>
  )
}

interface CreateServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ServiceFormData) => void
  isLoading?: boolean
}

export const CreateServiceModal: Component<CreateServiceModalProps> = (props) => {
  return (
    <ServiceModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      isLoading={props.isLoading}
      mode="create"
    />
  )
}

interface EditServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ServiceFormData) => void
  isLoading?: boolean
  service: Service
}

export const EditServiceModal: Component<EditServiceModalProps> = (props) => {
  return (
    <ServiceModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      isLoading={props.isLoading}
      service={props.service}
      mode="edit"
    />
  )
}
