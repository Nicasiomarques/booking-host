import { type Component, Show, createSignal } from 'solid-js'
import { useParams, A } from '@solidjs/router'
import { Button, Card, CardBody, Spinner, Alert, Badge } from '@/components/ui'
import { useEstablishment, EditEstablishmentModal, type Establishment } from '@/features/establishments'
import { authStore } from '@/stores'

const EstablishmentDetails: Component = () => {
  const params = useParams<{ id: string }>()
  const [isEditModalOpen, setIsEditModalOpen] = createSignal(false)

  const query = useEstablishment(() => params.id)
  const { isOwner } = authStore

  const canEdit = () => query.data && isOwner(query.data.id)

  return (
    <div class="space-y-6">
      {/* Breadcrumb */}
      <div class="text-sm breadcrumbs">
        <ul>
          <li><A href="/establishments">Establishments</A></li>
          <li>{query.data?.name ?? 'Loading...'}</li>
        </ul>
      </div>

      {/* Loading */}
      <Show when={query.isLoading}>
        <div class="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Show>

      {/* Error */}
      <Show when={query.isError}>
        <Alert variant="error">
          Failed to load establishment details. Please try again.
        </Alert>
      </Show>

      {/* Content */}
      <Show when={query.data}>
        {(establishment) => (
          <>
            {/* Header */}
            <div class="flex items-start justify-between">
              <div>
                <h1 class="text-2xl font-bold">{establishment().name}</h1>
                <div class="flex items-center gap-2 mt-2 text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{establishment().address}</span>
                </div>
              </div>
              <Show when={canEdit()}>
                <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
              </Show>
            </div>

            {/* Details Card */}
            <Card>
              <CardBody>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-sm font-medium text-base-content/60 mb-1">Description</h3>
                    <p class="text-base-content">
                      {establishment().description || 'No description provided'}
                    </p>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-base-content/60 mb-1">Timezone</h3>
                    <Badge variant="ghost">{establishment().timezone}</Badge>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-base-content/60 mb-1">Created</h3>
                    <p class="text-base-content">
                      {new Date(establishment().createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <A href={`/establishments/${params.id}/services`} class="block">
                <Card class="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardBody class="flex items-center gap-4">
                    <div class="p-3 bg-primary/10 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold">Services</h3>
                      <p class="text-sm text-base-content/60">Manage your services</p>
                    </div>
                  </CardBody>
                </Card>
              </A>

              <A href={`/establishments/${params.id}/availability`} class="block">
                <Card class="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardBody class="flex items-center gap-4">
                    <div class="p-3 bg-success/10 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold">Availability</h3>
                      <p class="text-sm text-base-content/60">Set available time slots</p>
                    </div>
                  </CardBody>
                </Card>
              </A>

              <A href={`/establishments/${params.id}/bookings`} class="block">
                <Card class="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardBody class="flex items-center gap-4">
                    <div class="p-3 bg-info/10 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold">Bookings</h3>
                      <p class="text-sm text-base-content/60">View and manage bookings</p>
                    </div>
                  </CardBody>
                </Card>
              </A>
            </div>

            {/* Edit Modal */}
            <Show when={isEditModalOpen()}>
              <EditEstablishmentModal
                isOpen={isEditModalOpen()}
                onClose={() => setIsEditModalOpen(false)}
                establishment={establishment() as Establishment}
              />
            </Show>
          </>
        )}
      </Show>
    </div>
  )
}

export default EstablishmentDetails
