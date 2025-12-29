import { formatDate } from '#shared/adapters/http/utils/response-formatters.js'

export function formatRoomResponse(room: {
  id: string
  serviceId: string
  number: string
  floor: number | null
  description: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...room,
    createdAt: formatDate(room.createdAt) ?? '',
    updatedAt: formatDate(room.updatedAt) ?? '',
  }
}

