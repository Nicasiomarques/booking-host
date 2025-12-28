import type { Component } from 'solid-js'
import { Modal } from '@/components/ui'
import { useToast } from '@/hooks'
import { useUpdateEstablishment } from '../hooks/useEstablishments'
import { EstablishmentForm, type EstablishmentFormData } from './EstablishmentForm'
import type { Establishment } from '../services/establishment.service'

interface EditEstablishmentModalProps {
  isOpen: boolean
  onClose: () => void
  establishment: Establishment
}

export const EditEstablishmentModal: Component<EditEstablishmentModalProps> = (props) => {
  const toast = useToast()
  const updateMutation = useUpdateEstablishment()

  const handleSubmit = async (data: EstablishmentFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: props.establishment.id,
        data,
      })
      toast.success('Establishment updated successfully!')
      props.onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update establishment')
    }
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Edit Establishment"
    >
      <EstablishmentForm
        initialData={props.establishment}
        onSubmit={handleSubmit}
        onCancel={props.onClose}
        isLoading={updateMutation.isPending}
        submitLabel="Save Changes"
      />
    </Modal>
  )
}
