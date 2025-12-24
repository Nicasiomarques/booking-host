import { type Component, For, Show, createSignal } from 'solid-js'
import { A } from '@solidjs/router'
import { Button, Card, CardBody, CardTitle, CardActions, Spinner, Alert } from '@/components/ui'
import { useEstablishments, CreateEstablishmentModal } from '@/features/establishments'

const Establishments: Component = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = createSignal(false)
  const query = useEstablishments()

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Establishments</h1>
          <p class="text-base-content/60 mt-1">
            Manage your establishments and their services.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Establishment
        </Button>
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
          Failed to load establishments. Please try again.
        </Alert>
      </Show>

      {/* Empty state */}
      <Show when={!query.isLoading && query.data?.length === 0}>
        <Card>
          <CardBody class="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 class="text-lg font-semibold mt-4">No establishments yet</h3>
            <p class="text-base-content/60 mt-2">
              Get started by creating your first establishment.
            </p>
            <Button class="mt-4" onClick={() => setIsCreateModalOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Create Establishment
            </Button>
          </CardBody>
        </Card>
      </Show>

      {/* Establishments grid */}
      <Show when={query.data && query.data.length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={query.data}>
            {(establishment) => (
              <Card class="hover:shadow-2xl transition-shadow">
                <CardBody>
                  <CardTitle>{establishment.name}</CardTitle>
                  <p class="text-base-content/60 text-sm mt-2 line-clamp-2">
                    {establishment.description || 'No description'}
                  </p>
                  <div class="flex items-center gap-2 mt-4 text-sm text-base-content/60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="truncate">{establishment.address}</span>
                  </div>
                  <CardActions class="mt-4">
                    <A href={`/establishments/${establishment.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                    </A>
                  </CardActions>
                </CardBody>
              </Card>
            )}
          </For>
        </div>
      </Show>

      {/* Create Modal */}
      <CreateEstablishmentModal
        isOpen={isCreateModalOpen()}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}

export default Establishments
