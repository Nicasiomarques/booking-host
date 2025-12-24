import type { Component } from 'solid-js'
import { Modal } from '@/components/ui'
import { useToast } from '@/hooks'
import { useCreateEstablishment } from '../hooks/useEstablishments'
import { EstablishmentForm, type EstablishmentFormData } from './EstablishmentForm'

interface CreateEstablishmentModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateEstablishmentModal: Component<CreateEstablishmentModalProps> = (props) => {
  const toast = useToast()
  const createMutation = useCreateEstablishment()

  const handleSubmit = async (data: EstablishmentFormData) => {
    try {
      await createMutation.mutateAsync(data)
      toast.success('Establishment created successfully!')
      props.onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create establishment')
    }
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Create Establishment"
    >
      <EstablishmentForm
        onSubmit={handleSubmit}
        onCancel={props.onClose}
        isLoading={createMutation.isPending}
        submitLabel="Create"
      />
    </Modal>
  )
}
