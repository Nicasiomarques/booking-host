import { zodToJsonSchema } from 'zod-to-json-schema'

interface RouteSchemaOptions {
  tags: string[]
  summary: string
  description?: string
  security?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  querystring?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responses: Record<number, { description: string; schema: any }>
}

export function buildRouteSchema(options: RouteSchemaOptions): object {
  const schema: Record<string, unknown> = {
    tags: options.tags,
    summary: options.summary,
  }

  if (options.description) {
    schema.description = options.description
  }

  if (options.security) {
    schema.security = [{ bearerAuth: [] }]
  }

  if (options.params) {
    schema.params = zodToJsonSchema(options.params, { $refStrategy: 'none' })
  }

  if (options.querystring) {
    schema.querystring = zodToJsonSchema(options.querystring, { $refStrategy: 'none' })
  }

  if (options.body) {
    schema.body = zodToJsonSchema(options.body, { $refStrategy: 'none' })
  }

  schema.response = {}
  for (const [code, config] of Object.entries(options.responses)) {
    const jsonSchema = zodToJsonSchema(config.schema, { $refStrategy: 'none' }) as Record<string, unknown>
    ;(schema.response as Record<string, unknown>)[code] = {
      description: config.description,
      ...jsonSchema,
    }
  }

  return schema
}
