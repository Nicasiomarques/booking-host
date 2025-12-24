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
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  CreateServiceModal,
  EditServiceModal,
  DeleteServiceModal,
  ExtraItemsList,
  type Service,
  type ServiceFormData,
} from '@/features/services'
import { useEstablishment } from '@/features/establishments'

const Services: Component = () => {
  const params = useParams<{ establishmentId: string }>()
  const [isCreateModalOpen, setIsCreateModalOpen] = createSignal(false)
  const [editingService, setEditingService] = createSignal<Service | null>(null)
  const [deletingService, setDeletingService] = createSignal<Service | null>(null)
  const [expandedServiceId, setExpandedServiceId] = createSignal<string | null>(null)

  const toggleExpanded = (serviceId: string) => {
    setExpandedServiceId((prev) => (prev === serviceId ? null : serviceId))
  }

  const establishmentQuery = useEstablishment(() => params.establishmentId)
  const servicesQuery = useServices(() => params.establishmentId)
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()

  const handleCreate = (data: ServiceFormData) => {
    createMutation.mutate(
      { establishmentId: params.establishmentId, data },
      {
        onSuccess: () => setIsCreateModalOpen(false),
      }
    )
  }

  const handleUpdate = (data: ServiceFormData) => {
    const service = editingService()
    if (!service) return

    updateMutation.mutate(
      { id: service.id, data },
      {
        onSuccess: () => setEditingService(null),
      }
    )
  }

  const handleDelete = () => {
    const service = deletingService()
    if (!service) return

    deleteMutation.mutate(
      { id: service.id, establishmentId: params.establishmentId },
      {
        onSuccess: () => setDeletingService(null),
      }
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
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
          <li>Services</li>
        </ul>
      </div>

      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Services</h1>
          <p class="text-base-content/60 mt-1">
            Manage services for {establishmentQuery.data?.name ?? 'this establishment'}.
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
          Add Service
        </Button>
      </div>

      {/* Loading */}
      <Show when={servicesQuery.isLoading}>
        <div class="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Show>

      {/* Error */}
      <Show when={servicesQuery.isError}>
        <Alert variant="error">Failed to load services. Please try again.</Alert>
      </Show>

      {/* Services Table */}
      <Show when={!servicesQuery.isLoading && servicesQuery.data}>
        <Card>
          <CardBody class="p-0">
            <Table zebra>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Duration</TableHeader>
                  <TableHeader>Price</TableHeader>
                  <TableHeader>Capacity</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader class="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <Show
                  when={servicesQuery.data!.length > 0}
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
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                        <h3 class="text-lg font-semibold mt-4">No services yet</h3>
                        <p class="text-base-content/60 mt-2">
                          Get started by creating your first service.
                        </p>
                        <Button class="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                          Create Service
                        </Button>
                      </div>
                    </TableEmpty>
                  }
                >
                  <For each={servicesQuery.data}>
                    {(service) => (
                      <>
                        <TableRow>
                          <TableCell>
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="btn btn-ghost btn-xs btn-square"
                                onClick={() => toggleExpanded(service.id)}
                                aria-label={
                                  expandedServiceId() === service.id
                                    ? 'Collapse extras'
                                    : 'Expand extras'
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class={`h-4 w-4 transition-transform ${expandedServiceId() === service.id ? 'rotate-90' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                              <div>
                                <div class="font-medium">{service.name}</div>
                                <Show when={service.description}>
                                  <div class="text-sm text-base-content/60 truncate max-w-xs">
                                    {service.description}
                                  </div>
                                </Show>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(service.durationMinutes)}</TableCell>
                          <TableCell>{formatPrice(service.basePrice)}</TableCell>
                          <TableCell>{service.capacity}</TableCell>
                          <TableCell>
                            <Badge variant={service.isActive ? 'success' : 'ghost'} size="sm">
                              {service.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell class="text-right">
                            <div class="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingService(service)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                class="text-error"
                                onClick={() => setDeletingService(service)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        <Show when={expandedServiceId() === service.id}>
                          <tr>
                            <td colSpan={6} class="bg-base-200/50 p-4">
                              <ExtraItemsList serviceId={service.id} serviceName={service.name} />
                            </td>
                          </tr>
                        </Show>
                      </>
                    )}
                  </For>
                </Show>
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </Show>

      {/* Create Modal */}
      <CreateServiceModal
        isOpen={isCreateModalOpen()}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      <Show when={editingService()}>
        <EditServiceModal
          isOpen={!!editingService()}
          onClose={() => setEditingService(null)}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          service={editingService()!}
        />
      </Show>

      {/* Delete Modal */}
      <DeleteServiceModal
        isOpen={!!deletingService()}
        onClose={() => setDeletingService(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        service={deletingService()}
      />
    </div>
  )
}

export default Services
