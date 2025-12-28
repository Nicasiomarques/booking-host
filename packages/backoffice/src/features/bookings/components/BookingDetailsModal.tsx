import { type Component, Show, For } from 'solid-js'
import { Modal, Badge, Button } from '@/components/ui'
import type { Booking, BookingStatus } from '../services/booking.service'

interface BookingDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking | null
  onCancel?: () => void
  isCancelling?: boolean
}

const statusVariant: Record<BookingStatus, 'info' | 'success' | 'error' | 'ghost'> = {
  PENDING: 'info',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'ghost',
}

export const BookingDetailsModal: Component<BookingDetailsModalProps> = (props) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Booking Details">
      <Show when={props.booking}>
        {(booking) => {
          console.log('BookingDetailsModal - booking:', booking())
          console.log('BookingDetailsModal - extraItems:', booking().extraItems)
          return (
          <div class="space-y-6">
            {/* Status and ID */}
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-base-content/60">Booking ID</span>
                <p class="font-mono text-sm">{booking().id}</p>
              </div>
              <Badge variant={statusVariant[booking().status]} size="lg">
                {booking().status}
              </Badge>
            </div>

            {/* Service Info */}
            <div class="bg-base-200 rounded-lg p-4">
              <h4 class="font-medium mb-2">Service</h4>
              <p class="text-lg font-semibold">{booking().serviceName}</p>
              <p class="text-base-content/60">
                {formatDate(booking().date)} · {formatTime(booking().startTime)} -{' '}
                {formatTime(booking().endTime)}
              </p>
            </div>

            {/* Customer Info */}
            <div>
              <h4 class="font-medium mb-2">Customer</h4>
              <div class="space-y-1">
                <p class="font-medium">{booking().customerName}</p>
                <p class="text-base-content/60">{booking().customerEmail}</p>
                <Show when={booking().customerPhone}>
                  <p class="text-base-content/60">{booking().customerPhone}</p>
                </Show>
              </div>
            </div>

            {/* Extra Items */}
            <Show when={booking().extraItems && Array.isArray(booking().extraItems) && booking().extraItems.length > 0}>
              <div>
                <h4 class="font-medium mb-2">Extra Items</h4>
                <div class="space-y-2">
                  <For each={booking().extraItems}>
                    {(item) => (
                      <div class="flex justify-between text-sm">
                        <span>
                          {item.name || 'Unknown'} x{item.quantity || 0}
                        </span>
                        <span>{formatPrice((item.price || 0) * (item.quantity || 0))}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Notes */}
            <Show when={booking().notes}>
              <div>
                <h4 class="font-medium mb-2">Notes</h4>
                <p class="text-sm text-base-content/80 bg-base-200 rounded-lg p-3">
                  {booking().notes}
                </p>
              </div>
            </Show>

            {/* Pricing */}
            <div class="border-t pt-4">
              <div class="flex justify-between text-sm mb-1">
                <span>Base Price</span>
                <span>{formatPrice(booking().basePrice)}</span>
              </div>
              <Show when={booking().extraItems.length > 0}>
                <div class="flex justify-between text-sm mb-1">
                  <span>Extra Items</span>
                  <span>
                    {formatPrice(booking().totalPrice - booking().basePrice)}
                  </span>
                </div>
              </Show>
              <div class="flex justify-between font-semibold text-lg mt-2">
                <span>Total</span>
                <span>{formatPrice(booking().totalPrice)}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div class="text-xs text-base-content/50 space-y-1">
              <p>Created: {formatDateTime(booking().createdAt)}</p>
              <p>Updated: {formatDateTime(booking().updatedAt)}</p>
            </div>

            {/* Actions */}
            <div class="flex justify-end gap-2 pt-4 border-t">
              <Button variant="ghost" onClick={props.onClose}>
                Close
              </Button>
              <Show when={booking().status !== 'CANCELLED' && booking().status !== 'COMPLETED'}>
                <Button
                  variant="outline"
                  class="text-error border-error hover:bg-error hover:text-error-content"
                  onClick={props.onCancel}
                  loading={props.isCancelling}
                >
                  Cancel Booking
                </Button>
              </Show>
            </div>
          </div>
          )
        }}
      </Show>
    </Modal>
  )
}
