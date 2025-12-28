import type { Role, DomainError, Either } from '#shared/domain/index.js'
import { ForbiddenError } from '#shared/domain/index.js'
import { left, right, isLeft } from '#shared/domain/index.js'

/**
 * Verifies that a user has OWNER role for an establishment
 * Returns Either<ForbiddenError, void>
 */
export async function requireOwnerRole(
  getUserRole: (userId: string, establishmentId: string) => Promise<Either<DomainError, Role | null>>,
  userId: string,
  establishmentId: string,
  action: string = 'perform this action'
): Promise<Either<ForbiddenError, void>> {
  const roleResult = await getUserRole(userId, establishmentId)
  if (isLeft(roleResult)) {
    return left(new ForbiddenError(`Failed to verify role: ${roleResult.value.message}`))
  }
  const role = roleResult.value
  if (role !== 'OWNER') {
    return left(new ForbiddenError(`Only owners can ${action}`))
  }
  return right(undefined)
}

