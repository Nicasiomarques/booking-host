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
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }
}

