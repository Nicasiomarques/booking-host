import { type Component, createSignal, Show, For } from 'solid-js'
import { useParams, A } from '@solidjs/router'
import {
  Button,
  Card,
  CardBody,
  Spinner,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableEmpty,
  Badge,
} from '@/components/ui'
import {
  useAvailability,
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
  CreateAvailabilityModal,
  EditAvailabilityModal,
  DeleteAvailabilityModal,
  type AvailabilitySlot,
  type AvailabilityFormData,
} from '@/features/availability'
import { useService } from '@/features/services'
import { useEstablishment } from '@/features/establishments'

const Availability: Component = () => {
  const params = useParams<{ establishmentId: string; serviceId: string }>()
  const [isCreateModalOpen, setIsCreateModalOpen] = createSignal(false)
  const [editingSlot, setEditingSlot] = createSignal<AvailabilitySlot | null>(null)
  const [deletingSlot, setDeletingSlot] = createSignal<AvailabilitySlot | null>(null)

  const establishmentQuery = useEstablishment(() => params.establishmentId)
  const serviceQuery = useService(() => params.serviceId)
  const availabilityQuery = useAvailability(() => params.serviceId)
  const createMutation = useCreateAvailability()
  const updateMutation = useUpdateAvailability()
  const deleteMutation = useDeleteAvailability()

  const handleCreate = (data: AvailabilityFormData) => {
    createMutation.mutate(
      { serviceId: params.serviceId, data },
      {
        onSuccess: () => setIsCreateModalOpen(false),
      }
    )
  }

  const handleUpdate = (data: AvailabilityFormData) => {
    const slot = editingSlot()
    if (!slot) return

    updateMutation.mutate(
      { id: slot.id, serviceId: params.serviceId, data },
      {
        onSuccess: () => setEditingSlot(null),
      }
    )
  }

  const handleDelete = () => {
    const slot = deletingSlot()
    if (!slot) return

    deleteMutation.mutate(
      { id: slot.id, serviceId: params.serviceId },
      {
        onSuccess: () => setDeletingSlot(null),
      }
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const getAvailabilityStatus = (slot: AvailabilitySlot) => {
    if (slot.bookedCount >= slot.capacity) return 'full'
    if (slot.bookedCount > 0) return 'partial'
    return 'available'
  }

  return (
    <div class="space-y-6">
      {/* Breadcrumb */}
      <div class="text-sm breadcrumbs">
        <ul>
          <li>
            <A href="/establishments">Establishments</A>
          </li>
          <li>
            <A href={`/establishments/${params.establishmentId}`}>
              {establishmentQuery.data?.name ?? 'Loading...'}
            </A>
          </li>
          <li>
            <A href={`/establishments/${params.establishmentId}/services`}>Services</A>
          </li>
          <li>{serviceQuery.data?.name ?? 'Loading...'}</li>
        </ul>
      </div>

      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Availability</h1>
          <p class="text-base-content/60 mt-1">
            Manage availability slots for {serviceQuery.data?.name ?? 'this service'}.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Slot
        </Button>
      </div>

      {/* Loading */}
      <Show when={availabilityQuery.isLoading}>
        <div class="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Show>

      {/* Error */}
      <Show when={availabilityQuery.isError}>
        <Alert variant="error">Failed to load availability slots. Please try again.</Alert>
      </Show>

      {/* Availability Table */}
      <Show when={!availabilityQuery.isLoading && availabilityQuery.data}>
        <Card>
          <CardBody class="p-0">
            <Table zebra>
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>Capacity</TableHeader>
                  <TableHeader>Booked</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader class="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <Show
                  when={availabilityQuery.data!.length > 0}
                  fallback={
                    <TableEmpty colSpan={6}>
                      <div class="text-center py-8">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-12 w-12 mx-auto text-base-content/30"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <h3 class="text-lg font-semibold mt-4">No availability slots yet</h3>
                        <p class="text-base-content/60 mt-2">
                          Get started by creating your first availability slot.
                        </p>
                        <Button class="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                          Create Slot
                        </Button>
                      </div>
                    </TableEmpty>
                  }
                >
                  <For each={availabilityQuery.data}>
                    {(slot) => (
                      <TableRow>
                        <TableCell>
                          <div class="font-medium">{formatDate(slot.date)}</div>
                        </TableCell>
                        <TableCell>
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </TableCell>
                        <TableCell>{slot.capacity}</TableCell>
                        <TableCell>{slot.bookedCount}</TableCell>
                        <TableCell>
                          <Show
                            when={getAvailabilityStatus(slot) === 'full'}
                            fallback={
                              <Show
                                when={getAvailabilityStatus(slot) === 'partial'}
                                fallback={
                                  <Badge variant="success" size="sm">
                                    Available
                                  </Badge>
                                }
                              >
                                <Badge variant="warning" size="sm">
                                  Partial
                                </Badge>
                              </Show>
                            }
                          >
                            <Badge variant="error" size="sm">
                              Full
                            </Badge>
                          </Show>
                        </TableCell>
                        <TableCell class="text-right">
                          <div class="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSlot(slot)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              class="text-error"
                              onClick={() => setDeletingSlot(slot)}
                              disabled={slot.bookedCount > 0}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </Show>
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </Show>

      {/* Create Modal */}
      <CreateAvailabilityModal
        isOpen={isCreateModalOpen()}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      <Show when={editingSlot()}>
        <EditAvailabilityModal
          isOpen={!!editingSlot()}
          onClose={() => setEditingSlot(null)}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          slot={editingSlot()!}
        />
      </Show>

      {/* Delete Modal */}
      <DeleteAvailabilityModal
        isOpen={!!deletingSlot()}
        onClose={() => setDeletingSlot(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        slot={deletingSlot()}
      />
    </div>
  )
}

export default Availability
