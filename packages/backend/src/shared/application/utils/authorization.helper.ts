import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'

/**
 * Verifies that a user has OWNER role for an establishment
 * Returns Either<ForbiddenError, void>
 */
export async function requireOwnerRole(
  getUserRole: (userId: string, establishmentId: string) => Promise<Domain.Either<Domain.DomainError, Domain.Role | null>>,
  userId: string,
  establishmentId: string,
  action: string = 'perform this action'
): Promise<Domain.Either<DomainValues.ForbiddenError, void>> {
  const roleResult = await getUserRole(userId, establishmentId)
  if (DomainValues.isLeft(roleResult)) {
    return DomainValues.left(new DomainValues.ForbiddenError(`Failed to verify role: ${roleResult.value.message}`))
  }
  const role = roleResult.value
  if (role !== 'OWNER') {
    return DomainValues.left(new DomainValues.ForbiddenError(`Only owners can ${action}`))
  }
  return DomainValues.right(undefined)
}

