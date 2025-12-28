import type { ZodTypeAny } from 'zod'
import { ErrorResponseSchema, SuccessResponseSchema } from '../openapi/index.js'

/**
 * Common response schemas for CRUD operations
 */
export const commonCrudResponses = {
  unauthorized: { description: 'Unauthorized', schema: ErrorResponseSchema },
  forbidden: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
  notFound: (entityName: string) => ({
    description: `${entityName} not found`,
    schema: ErrorResponseSchema,
  }),
  validationError: { description: 'Validation error', schema: ErrorResponseSchema },
  success: { description: 'Operation successful', schema: SuccessResponseSchema },
}

/**
 * Standard responses for GET by ID operations
 */
export function getByIdResponses(entityName: string, responseSchema: ZodTypeAny) {
  return {
    200: { description: `${entityName} details`, schema: responseSchema },
    404: commonCrudResponses.notFound(entityName),
  }
}

/**
 * Standard responses for UPDATE operations
 */
export function updateResponses(entityName: string, responseSchema: ZodTypeAny, additionalResponses: Record<number, { description: string; schema: ZodTypeAny }> = {}) {
  return {
    200: { description: `${entityName} updated successfully`, schema: responseSchema },
    401: commonCrudResponses.unauthorized,
    403: commonCrudResponses.forbidden,
    404: commonCrudResponses.notFound(entityName),
    422: commonCrudResponses.validationError,
    ...additionalResponses,
  }
}

/**
 * Standard responses for DELETE operations
 */
export function deleteResponses(entityName: string, additionalResponses: Record<number, { description: string; schema: ZodTypeAny }> = {}) {
  return {
    200: { description: `${entityName} deleted successfully`, schema: SuccessResponseSchema },
    401: commonCrudResponses.unauthorized,
    403: commonCrudResponses.forbidden,
    404: commonCrudResponses.notFound(entityName),
    ...additionalResponses,
  }
}

/**
 * Standard responses for CREATE operations
 */
export function createResponses(entityName: string, responseSchema: ZodTypeAny, additionalResponses: Record<number, { description: string; schema: ZodTypeAny }> = {}) {
  return {
    201: { description: `${entityName} created successfully`, schema: responseSchema },
    401: commonCrudResponses.unauthorized,
    403: commonCrudResponses.forbidden,
    404: commonCrudResponses.notFound(entityName),
    422: commonCrudResponses.validationError,
    ...additionalResponses,
  }
}

