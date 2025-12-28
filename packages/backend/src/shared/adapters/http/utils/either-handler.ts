import { FastifyReply } from 'fastify'
import type { DomainError, Either } from '#shared/domain/index.js'
import { isLeft } from '#shared/domain/index.js'

/**
 * Helper to convert Either<DomainError, T> to HTTP response
 * If Left, sends error response with appropriate status code
 * If Right, sends success response with the value
 */
export function handleEither<T>(
  either: Either<DomainError, T>,
  reply: FastifyReply,
  onSuccess: (value: T) => any = (value) => value,
  successStatus: number = 200
): FastifyReply | void {
  if (isLeft(either)) {
    const error = either.value
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.code === 'VALIDATION_ERROR' && (error as any).details
          ? { details: (error as any).details }
          : {}),
      },
    })
  }

  const result = onSuccess(either.value)
  return reply.status(successStatus).send(result)
}

/**
 * Helper for async operations that return Either
 */
export async function handleEitherAsync<T>(
  eitherPromise: Promise<Either<DomainError, T>>,
  reply: FastifyReply,
  onSuccess: (value: T) => any = (value) => value,
  successStatus: number = 200
): Promise<FastifyReply | void> {
  const either = await eitherPromise
  return handleEither(either, reply, onSuccess, successStatus)
}

