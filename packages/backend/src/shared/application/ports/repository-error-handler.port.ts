/**
 * Database error types that the application layer needs to handle
 */
export enum DatabaseErrorType {
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Normalized database error information
 */
export interface DatabaseErrorInfo {
  type: DatabaseErrorType
  field?: string
  message: string
}

/**
 * Port interface for translating database-specific errors to domain errors.
 * Allows the application layer to handle database errors without knowing
 * the underlying database technology.
 */
export interface RepositoryErrorHandlerPort {
  /**
   * Analyze an error and return normalized error information
   */
  analyze(error: unknown): DatabaseErrorInfo | null
  isUniqueConstraintViolation(error: unknown): boolean
}

