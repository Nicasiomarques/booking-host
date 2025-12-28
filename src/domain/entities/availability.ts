export interface CreateAvailabilityData {
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  price?: number
  notes?: string
  isRecurring?: boolean
}

export interface UpdateAvailabilityData {
  date?: Date
  startTime?: string
  endTime?: string
  capacity?: number
  price?: number
  notes?: string
  isRecurring?: boolean
}

export interface Availability {
  id: string
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  price: string | null
  notes: string | null
  isRecurring: boolean
  createdAt: Date
  updatedAt: Date
}
