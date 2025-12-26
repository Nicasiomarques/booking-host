import { type Component, createSignal, Show, For, createMemo } from 'solid-js'
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
  Input,
  Select,
} from '@/components/ui'
import {
  useBookings,
  useCancelBooking,
  useConfirmBooking,
  BookingDetailsModal,
  CancelBookingModal,
  type Booking,
  type BookingStatus,
  type BookingFilters,
} from '@/features/bookings'
import { useEstablishment } from '@/features/establishments'
import { useServices } from '@/features/services'

const statusVariant: Record<BookingStatus, 'info' | 'success' | 'error' | 'ghost'> = {
  PENDING: 'info',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'ghost',
}

const Bookings: Component = () => {
  const params = useParams<{ establishmentId: string }>()
  const [selectedBooking, setSelectedBooking] = createSignal<Booking | null>(null)
  const [cancellingBooking, setCancellingBooking] = createSignal<Booking | null>(null)
  const [page, setPage] = createSignal(1)
  const [filters, setFilters] = createSignal<BookingFilters>({})

  const establishmentQuery = useEstablishment(() => params.establishmentId)
  const servicesQuery = useServices(() => params.establishmentId)
  const bookingsQuery = useBookings(
    () => params.establishmentId,
    () => filters(),
    () => page()
  )
  const cancelMutation = useCancelBooking()
  const confirmMutation = useConfirmBooking()

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }))
    setPage(1)
  }

  const handleCancel = () => {
    const booking = cancellingBooking()
    if (!booking) return

    cancelMutation.mutate(
      { id: booking.id, establishmentId: params.establishmentId },
      {
        onSuccess: () => {
          setCancellingBooking(null)
          setSelectedBooking(null)
        },
      }
    )
  }

  const handleCancelFromDetails = () => {
    const booking = selectedBooking()
    if (booking) {
      setCancellingBooking(booking)
    }
  }

  const handleConfirm = (booking: Booking) => {
    confirmMutation.mutate(
      { id: booking.id, establishmentId: params.establishmentId },
      {
        onSuccess: () => {
          setSelectedBooking(null)
        },
      }
    )
  }

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'Invalid Date'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('pt-PT', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (time: string | undefined | null) => {
    if (!time) return ''
    return time.slice(0, 5)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const totalPages = createMemo(() => bookingsQuery.data?.totalPages ?? 1)

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
          <li>Bookings</li>
        </ul>
      </div>

      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Bookings</h1>
          <p class="text-base-content/60 mt-1">
            View and manage bookings for {establishmentQuery.data?.name ?? 'this establishment'}.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="label" for="filter-status">
                <span class="label-text">Status</span>
              </label>
              <Select
                id="filter-status"
                value={filters().status ?? ''}
                onChange={(e) => handleFilterChange('status', e.currentTarget.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
            <div>
              <label class="label" for="filter-service">
                <span class="label-text">Service</span>
              </label>
              <Select
                id="filter-service"
                value={filters().serviceId ?? ''}
                onChange={(e) => handleFilterChange('serviceId', e.currentTarget.value)}
              >
                <option value="">All Services</option>
                <For each={servicesQuery.data}>
                  {(service) => <option value={service.id}>{service.name}</option>}
                </For>
              </Select>
            </div>
            <div>
              <label class="label" for="filter-start-date">
                <span class="label-text">Start Date</span>
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={filters().startDate ?? ''}
                onInput={(e) => handleFilterChange('startDate', e.currentTarget.value)}
              />
            </div>
            <div>
              <label class="label" for="filter-end-date">
                <span class="label-text">End Date</span>
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={filters().endDate ?? ''}
                onInput={(e) => handleFilterChange('endDate', e.currentTarget.value)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Loading */}
      <Show when={bookingsQuery.isLoading}>
        <div class="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Show>

      {/* Error */}
      <Show when={bookingsQuery.isError}>
        <Alert variant="error">Failed to load bookings. Please try again.</Alert>
      </Show>

      {/* Bookings Table */}
      <Show when={!bookingsQuery.isLoading && bookingsQuery.data}>
        <Card>
          <CardBody class="p-0">
            <Table zebra>
              <TableHead>
                <TableRow>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader>Service</TableHeader>
                  <TableHeader>Date & Time</TableHeader>
                  <TableHeader>Total</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader class="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <Show
                  when={bookingsQuery.data!.data.length > 0}
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
                        <h3 class="text-lg font-semibold mt-4">No bookings found</h3>
                        <p class="text-base-content/60 mt-2">
                          {Object.keys(filters()).length > 0
                            ? 'Try adjusting your filters.'
                            : 'Bookings will appear here once customers make reservations.'}
                        </p>
                      </div>
                    </TableEmpty>
                  }
                >
                  <For each={bookingsQuery.data!.data}>
                    {(booking) => (
                      <TableRow>
                        <TableCell>
                          <div>
                            <div class="font-medium">{booking.customerName}</div>
                            <div class="text-sm text-base-content/60">{booking.customerEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{booking.serviceName}</TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(booking.date)}</div>
                            <div class="text-sm text-base-content/60">
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatPrice(booking.totalPrice)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[booking.status]} size="sm">
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell class="text-right">
                          <div class="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              View
                            </Button>
                            <Show when={booking.status === 'PENDING'}>
                              <Button
                                variant="ghost"
                                size="sm"
                                class="text-success"
                                onClick={() => handleConfirm(booking)}
                                disabled={confirmMutation.isPending}
                              >
                                Confirm
                              </Button>
                            </Show>
                            <Show
                              when={
                                booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED'
                              }
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                class="text-error"
                                onClick={() => setCancellingBooking(booking)}
                                disabled={cancelMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </Show>
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

        {/* Pagination */}
        <Show when={bookingsQuery.data && bookingsQuery.data.totalPages > 1}>
          <div class="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page() <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span class="flex items-center px-4">
              Page {page()} of {totalPages()}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page() >= totalPages()}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </Show>
      </Show>

      {/* Details Modal */}
      <BookingDetailsModal
        isOpen={!!selectedBooking()}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking()}
        onCancel={handleCancelFromDetails}
        isCancelling={cancelMutation.isPending}
      />

      {/* Cancel Modal */}
      <CancelBookingModal
        isOpen={!!cancellingBooking()}
        onClose={() => setCancellingBooking(null)}
        onConfirm={handleCancel}
        isLoading={cancelMutation.isPending}
        booking={cancellingBooking()}
      />
    </div>
  )
}

export default Bookings
