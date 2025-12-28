import { zodToJsonSchema } from 'zod-to-json-schema'
import { getOpenApiMetadata } from '@asteasolutions/zod-to-openapi'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodToJsonSchemaWithExample(zodSchema: any): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema, { $refStrategy: 'none' }) as Record<string, unknown>
  const metadata = getOpenApiMetadata(zodSchema)
  if (metadata?.example !== undefined) {
    jsonSchema.example = metadata.example
  }
  return jsonSchema
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
    schema.params = zodToJsonSchemaWithExample(options.params)
  }

  if (options.querystring) {
    schema.querystring = zodToJsonSchemaWithExample(options.querystring)
  }

  if (options.body) {
    schema.body = zodToJsonSchemaWithExample(options.body)
  }

  schema.response = {}
  for (const [code, config] of Object.entries(options.responses)) {
    const jsonSchema = zodToJsonSchemaWithExample(config.schema)
    ;(schema.response as Record<string, unknown>)[code] = {
      description: config.description,
      ...jsonSchema,
    }
  }

  return schema
}
