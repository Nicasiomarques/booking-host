import type { Role } from '#domain/index.js'
import { ForbiddenError } from '#domain/index.js'

/**
 * Verifies that a user has OWNER role for an establishment
 * Throws ForbiddenError if user is not an owner
 */
export async function requireOwnerRole(
  getUserRole: (userId: string, establishmentId: string) => Promise<Role | null>,
  userId: string,
  establishmentId: string,
  action: string = 'perform this action'
): Promise<void> {
  const role = await getUserRole(userId, establishmentId)
  if (role !== 'OWNER') {
    throw new ForbiddenError(`Only owners can ${action}`)
  }
}

