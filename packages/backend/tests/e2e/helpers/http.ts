import { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify'
import { expect } from 'vitest'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestOptions {
  token?: string
  payload?: unknown
  query?: Record<string, string | number>
  cookies?: Record<string, string>
}

export interface TestResponse<T = unknown> {
  status: number
  body: T
  raw: LightMyRequestResponse
}

export async function request<T = unknown>(
  app: FastifyInstance,
  method: HttpMethod,
  url: string,
  options: RequestOptions = {}
): Promise<TestResponse<T>> {
  const { token, payload, query, cookies } = options

  const injectOptions: InjectOptions = {
    method,
    url,
  }

  if (token) {
    injectOptions.headers = { authorization: `Bearer ${token}` }
  }

  if (payload) {
    injectOptions.payload = payload
  }

  if (query) {
    const queryString = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)])
    ).toString()
    injectOptions.url = `${url}?${queryString}`
  }

  if (cookies) {
    injectOptions.cookies = cookies
  }

  const response = await app.inject(injectOptions)

  let body: T
  try {
    body = JSON.parse(response.body) as T
  } catch {
    body = response.body as T
  }

  return {
    status: response.statusCode,
    body,
    raw: response,
  }
}

export const get = <T = unknown>(app: FastifyInstance, url: string, options?: RequestOptions) =>
  request<T>(app, 'GET', url, options)

export const post = <T = unknown>(app: FastifyInstance, url: string, options?: RequestOptions) =>
  request<T>(app, 'POST', url, options)

export const put = <T = unknown>(app: FastifyInstance, url: string, options?: RequestOptions) =>
  request<T>(app, 'PUT', url, options)

export const del = <T = unknown>(app: FastifyInstance, url: string, options?: RequestOptions) =>
  request<T>(app, 'DELETE', url, options)

export function expectStatus<T>(response: TestResponse<T>, expectedStatus: number): T {
  expect(response.status).toBe(expectedStatus)
  return response.body
}

export function expectSuccess<T>(response: TestResponse<T>): T {
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
  return response.body
}

export interface ErrorResponse {
  error?: {
    code?: string
    message?: string
  }
}

export function expectError(
  response: TestResponse<ErrorResponse>,
  expectedStatus: number,
  expectedCode?: string
): void {
  expect(response.status).toBe(expectedStatus)
  if (expectedCode) {
    expect(response.body.error?.code).toBe(expectedCode)
  }
}
