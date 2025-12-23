import { Prisma } from '@prisma/client'
import type {
  RepositoryErrorHandlerPort,
  DatabaseErrorInfo,
} from '#application/ports/index.js'
import { DatabaseErrorType } from '#application/ports/index.js'

/**
 * Prisma implementation of the RepositoryErrorHandlerPort.
 * Translates Prisma-specific errors to normalized database errors.
 */
export class PrismaRepositoryErrorHandlerAdapter implements RepositoryErrorHandlerPort {
  analyze(error: unknown): DatabaseErrorInfo | null {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return null
    }

    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined
        return {
          type: DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION,
          field: target?.[0],
          message: `Unique constraint violation on field: ${target?.join(', ') ?? 'unknown'}`,
        }
      }
      case 'P2003': {
        // Foreign key constraint violation
        const field = error.meta?.field_name as string | undefined
        return {
          type: DatabaseErrorType.FOREIGN_KEY_VIOLATION,
          field,
          message: `Foreign key constraint violation on field: ${field ?? 'unknown'}`,
        }
      }
      case 'P2025': {
        // Record not found
        return {
          type: DatabaseErrorType.NOT_FOUND,
          message: 'Record not found',
        }
      }
      default:
        return {
          type: DatabaseErrorType.UNKNOWN,
          message: error.message,
        }
    }
  }

  isUniqueConstraintViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false
    }
    return error.code === 'P2002'
  }
}
