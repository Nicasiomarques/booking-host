import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { buildRouteSchema, ErrorResponseSchema } from '../openapi/index.js'
import { authenticate, validate } from '../middleware/index.js'
import { idParamSchema } from '../schemas/common.schema.js'
import { getByIdResponses, updateResponses, deleteResponses, createResponses } from './crud-helpers.js'
import { handleEitherAsync } from './either-handler.js'
import type { DomainError, Either } from '#shared/domain/index.js'

/**
 * Helper to register a GET by ID endpoint
 */
export function registerGetByIdEndpoint<TEntity>(
  fastify: FastifyInstance,
  options: {
    path: string
    tags: string[]
    entityName: string
    responseSchema: z.ZodSchema
    service: {
      findById: (id: string) => Promise<Either<DomainError, TEntity>>
    }
    formatter?: (entity: TEntity) => any
    description?: string
    requiresAuth?: boolean
  }
) {
  const { path, tags, entityName, responseSchema, service, formatter, description, requiresAuth = false } = options

  fastify.get<{ Params: { id: string } }>(
    path,
    {
      schema: buildRouteSchema({
        tags,
        summary: `Get ${entityName.toLowerCase()} by ID`,
        description: description || `Retrieves detailed information about a specific ${entityName.toLowerCase()}. No authentication required.`,
        params: idParamSchema,
        responses: getByIdResponses(entityName, responseSchema),
      }),
      preHandler: requiresAuth ? [authenticate] : [],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.findById(request.params.id),
        reply,
        (result) => formatter ? formatter(result) : result
      )
    }
  )
}

/**
 * Helper to register a PUT update endpoint
 */
export function registerUpdateEndpoint<TEntity, TUpdateInput>(
  fastify: FastifyInstance,
  options: {
    path: string
    tags: string[]
    entityName: string
    updateSchema: z.ZodSchema
    responseSchema: z.ZodSchema
    service: {
      update: (id: string, data: TUpdateInput, userId: string) => Promise<Either<DomainError, TEntity>>
    }
    formatter?: (entity: TEntity) => any
    description?: string
    additionalResponses?: Record<number, { description: string; schema: z.ZodSchema }>
    preHandler?: Array<(request: FastifyRequest, reply: FastifyReply) => Promise<void> | void>
  }
) {
  const {
    path,
    tags,
    entityName,
    updateSchema,
    responseSchema,
    service,
    formatter,
    description,
    additionalResponses,
    preHandler = [],
  } = options

  fastify.put<{ Params: { id: string }; Body: TUpdateInput }>(
    path,
    {
      schema: buildRouteSchema({
        tags,
        summary: `Update ${entityName.toLowerCase()}`,
        description: description || `Updates an existing ${entityName.toLowerCase()}. Only the establishment owner can perform this action.`,
        security: true,
        params: idParamSchema,
        body: updateSchema,
        responses: updateResponses(entityName, responseSchema, additionalResponses),
      }),
      preHandler: [authenticate, validate(updateSchema), ...preHandler],
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: TUpdateInput }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.update(request.params.id, request.body as TUpdateInput, request.user.userId),
        reply,
        (result) => formatter ? formatter(result) : result
      )
    }
  )
}

/**
 * Helper to register a DELETE endpoint
 */
export function registerDeleteEndpoint<TEntity>(
  fastify: FastifyInstance,
  options: {
    path: string
    tags: string[]
    entityName: string
    service: {
      delete: (id: string, userId: string) => Promise<Either<DomainError, TEntity>>
    }
    description?: string
    additionalResponses?: Record<number, { description: string; schema: z.ZodSchema }>
    preHandler?: Array<(request: FastifyRequest, reply: FastifyReply) => Promise<void> | void>
  }
) {
  const { path, tags, entityName, service, description, additionalResponses, preHandler = [] } = options

  fastify.delete<{ Params: { id: string } }>(
    path,
    {
      schema: buildRouteSchema({
        tags,
        summary: `Delete ${entityName.toLowerCase()}`,
        description:
          description ||
          `Deletes a ${entityName.toLowerCase()}. Only the establishment owner can perform this action.`,
        security: true,
        params: idParamSchema,
        responses: deleteResponses(entityName, additionalResponses),
      }),
      preHandler: [authenticate, ...preHandler],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.delete(request.params.id, request.user.userId),
        reply,
        () => ({ success: true })
      )
    }
  )
}

/**
 * Helper to register a POST create endpoint
 */
export function registerCreateEndpoint<TEntity, TCreateInput, TParams extends Record<string, any> = Record<string, string>>(
  fastify: FastifyInstance,
  options: {
    path: string
    tags: string[]
    entityName: string
    createSchema: z.ZodSchema
    responseSchema: z.ZodSchema
    paramsSchema?: z.ZodSchema
    service: {
      create: (params: TParams, data: TCreateInput, userId: string) => Promise<Either<DomainError, TEntity>>
    }
    formatter?: (entity: TEntity) => any
    description?: string
    additionalResponses?: Record<number, { description: string; schema: z.ZodSchema }>
    preHandler?: Array<(request: FastifyRequest, reply: FastifyReply) => Promise<void> | void>
    extractParams?: (request: FastifyRequest<{ Params: Record<string, string> }>) => TParams
  }
) {
  const {
    path,
    tags,
    entityName,
    createSchema,
    responseSchema,
    paramsSchema,
    service,
    formatter,
    description,
    additionalResponses,
    preHandler = [],
    extractParams,
  } = options

  fastify.post<{ Params: Record<string, string>; Body: TCreateInput }>(
    path,
    {
      schema: buildRouteSchema({
        tags,
        summary: `Create ${entityName.toLowerCase()}`,
        description: description || `Creates a new ${entityName.toLowerCase()}. Only the establishment owner can perform this action.`,
        security: true,
        params: paramsSchema,
        body: createSchema,
        responses: createResponses(entityName, responseSchema, additionalResponses),
      }),
      preHandler: [authenticate, validate(createSchema), ...preHandler],
    },
    async (
      request: FastifyRequest<{ Params: Record<string, string>; Body: TCreateInput }>,
      reply: FastifyReply
    ) => {
      const params = extractParams ? extractParams(request) : ({} as TParams)
      return handleEitherAsync(
        service.create(params, request.body as TCreateInput, request.user.userId),
        reply,
        (result) => formatter ? formatter(result) : result,
        201
      )
    }
  )
}

/**
 * Helper to register a GET list endpoint
 */
export function registerListEndpoint<TEntity, TQuery extends Record<string, any> = Record<string, any>>(
  fastify: FastifyInstance,
  options: {
    path: string
    tags: string[]
    entityName: string
    responseSchema: z.ZodSchema
    paramsSchema?: z.ZodSchema
    querySchema?: z.ZodSchema
    service: {
      findByX: (params: Record<string, string>, query: TQuery) => Promise<Either<DomainError, TEntity[]>>
    }
    formatter?: (entity: TEntity) => any
    description?: string
    requiresAuth?: boolean
    extractParams?: (request: FastifyRequest<{ Params: Record<string, string> }>) => Record<string, string>
    extractQuery?: (request: FastifyRequest<{ Querystring: Record<string, any> }>) => TQuery
  }
) {
  const {
    path,
    tags,
    entityName,
    responseSchema,
    paramsSchema,
    querySchema,
    service,
    formatter,
    description,
    requiresAuth = false,
    extractParams,
    extractQuery,
  } = options

  fastify.get<{ Params: Record<string, string>; Querystring: Record<string, any> }>(
    path,
    {
      schema: buildRouteSchema({
        tags,
        summary: `List ${entityName.toLowerCase()}s`,
        description: description || `Retrieves all ${entityName.toLowerCase()}s. No authentication required.`,
        params: paramsSchema,
        querystring: querySchema,
        responses: {
          200: { description: `List of ${entityName.toLowerCase()}s`, schema: z.array(responseSchema) },
          404: { description: 'Resource not found', schema: ErrorResponseSchema },
        },
      }),
      preHandler: requiresAuth ? [authenticate] : [],
    },
    async (request: FastifyRequest<{ Params: Record<string, string>; Querystring: Record<string, any> }>, reply: FastifyReply) => {
      const params = extractParams ? extractParams(request) : request.params
      const query = extractQuery ? extractQuery(request) : (request.query as TQuery)
      return handleEitherAsync(
        service.findByX(params, query),
        reply,
        (results) => results.map((item) => (formatter ? formatter(item) : item))
      )
    }
  )
}

