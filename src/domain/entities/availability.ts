export interface CreateAvailabilityData {
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
}

export interface UpdateAvailabilityData {
  date?: Date
  startTime?: string
  endTime?: string
  capacity?: number
}

export interface Availability {
  id: string
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  createdAt: Date
  updatedAt: Date
}
