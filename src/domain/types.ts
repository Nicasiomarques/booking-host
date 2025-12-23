export type Role = 'OWNER' | 'STAFF'

export interface EstablishmentRole {
  establishmentId: string
  role: Role
}
