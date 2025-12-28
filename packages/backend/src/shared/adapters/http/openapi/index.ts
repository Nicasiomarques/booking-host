export { registry } from './registry.js'

export {
  ErrorResponseSchema,
  SuccessResponseSchema,
  PaginationMetaSchema,
  TimestampFieldsSchema,
} from './common.schemas.js'
export type { ErrorResponse, SuccessResponse, PaginationMeta } from './common.schemas.js'

export { buildRouteSchema } from './fastify-schema.js'
