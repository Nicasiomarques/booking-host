import { type Component, createSignal, Show, For } from 'solid-js'
import { Button, Card, CardBody, Spinner, Alert, ConfirmModal } from '@/components/ui'
import {
  useExtraItems,
  useCreateExtraItem,
  useUpdateExtraItem,
  useDeleteExtraItem,
} from '../hooks/useExtraItems'
import { ExtraItemForm, type ExtraItemFormData } from './ExtraItemForm'
import type { ExtraItem } from '../services/extra-item.service'

interface ExtraItemsListProps {
  serviceId: string
  serviceName: string
}

export const ExtraItemsList: Component<ExtraItemsListProps> = (props) => {
  const [isAddingNew, setIsAddingNew] = createSignal(false)
  const [editingItem, setEditingItem] = createSignal<ExtraItem | null>(null)
  const [deletingItem, setDeletingItem] = createSignal<ExtraItem | null>(null)

  const query = useExtraItems(() => props.serviceId)
  const createMutation = useCreateExtraItem()
  const updateMutation = useUpdateExtraItem()
  const deleteMutation = useDeleteExtraItem()

  const handleCreate = (data: ExtraItemFormData) => {
    createMutation.mutate(
      { serviceId: props.serviceId, data },
      {
        onSuccess: () => setIsAddingNew(false),
      }
    )
  }

  const handleUpdate = (data: ExtraItemFormData) => {
    const item = editingItem()
    if (!item) return

    updateMutation.mutate(
      { id: item.id, serviceId: props.serviceId, data },
      {
        onSuccess: () => setEditingItem(null),
      }
    )
  }

  const handleDelete = () => {
    const item = deletingItem()
    if (!item) return

    deleteMutation.mutate(
      { id: item.id, serviceId: props.serviceId },
      {
        onSuccess: () => setDeletingItem(null),
      }
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-base-content/80">Extra Items</h4>
        <Show when={!isAddingNew()}>
          <Button size="sm" variant="ghost" onClick={() => setIsAddingNew(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Extra
          </Button>
        </Show>
      </div>

      {/* Loading */}
      <Show when={query.isLoading}>
        <div class="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      </Show>

      {/* Error */}
      <Show when={query.isError}>
        <Alert variant="error">Failed to load extra items.</Alert>
      </Show>

      {/* Add New Form */}
      <Show when={isAddingNew()}>
        <Card class="bg-base-200">
          <CardBody class="p-4">
            <h5 class="font-medium mb-3">New Extra Item</h5>
            <ExtraItemForm
              onSubmit={handleCreate}
              onCancel={() => setIsAddingNew(false)}
              isLoading={createMutation.isPending}
              submitLabel="Add"
            />
          </CardBody>
        </Card>
      </Show>

      {/* Extra Items List */}
      <Show when={!query.isLoading && query.data}>
        <Show
          when={query.data!.length > 0}
          fallback={
            <Show when={!isAddingNew()}>
              <p class="text-sm text-base-content/60 text-center py-4">
                No extra items yet. Add extras that customers can select when booking.
              </p>
            </Show>
          }
        >
          <div class="space-y-2">
            <For each={query.data}>
              {(item) => (
                <Show
                  when={editingItem()?.id !== item.id}
                  fallback={
                    <Card class="bg-base-200">
                      <CardBody class="p-4">
                        <h5 class="font-medium mb-3">Edit Extra Item</h5>
                        <ExtraItemForm
                          initialData={item}
                          onSubmit={handleUpdate}
                          onCancel={() => setEditingItem(null)}
                          isLoading={updateMutation.isPending}
                          submitLabel="Save"
                        />
                      </CardBody>
                    </Card>
                  }
                >
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div class="flex-1">
                      <span class="font-medium">{item.name}</span>
                      <span class="text-base-content/60 ml-2">
                        {formatPrice(item.price)} · max {item.maxQuantity}
                      </span>
                    </div>
                    <div class="flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingItem(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        class="text-error"
                        onClick={() => setDeletingItem(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingItem()}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Delete Extra Item"
        message={`Are you sure you want to delete "${deletingItem()?.name}"?`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
