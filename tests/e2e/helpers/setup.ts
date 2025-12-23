import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/adapters/inbound/http/http.adapter.js'

let app: FastifyInstance | null = null

export async function getTestApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp()
    await app.ready()
  }
  return app
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close()
    app = null
  }
}

export interface TestUser {
  id: string
  email: string
  name: string
  accessToken: string
}

export async function createTestUser(
  app: FastifyInstance,
  data: { email: string; password: string; name: string }
): Promise<TestUser> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: data,
  })

  const body = JSON.parse(response.body)
  return {
    id: body.user.id,
    email: body.user.email,
    name: body.user.name,
    accessToken: body.accessToken,
  }
}

export async function loginTestUser(
  app: FastifyInstance,
  data: { email: string; password: string }
): Promise<{ accessToken: string; cookies: string[] }> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: data,
  })

  const body = JSON.parse(response.body)
  const cookies = response.cookies.map((c) => `${c.name}=${c.value}`)

  return {
    accessToken: body.accessToken,
    cookies,
  }
}

export async function createTestEstablishment(
  app: FastifyInstance,
  accessToken: string,
  data: { name: string; description?: string; address: string; timezone?: string }
): Promise<{ id: string; name: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/establishments',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      timezone: 'UTC',
      ...data,
    },
  })

  return JSON.parse(response.body)
}

export async function createTestService(
  app: FastifyInstance,
  accessToken: string,
  establishmentId: string,
  data: {
    name: string
    description?: string
    basePrice: number
    durationMinutes: number
    capacity?: number
  }
): Promise<{ id: string; name: string; establishmentId: string }> {
  const response = await app.inject({
    method: 'POST',
    url: `/v1/establishments/${establishmentId}/services`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      capacity: 1,
      ...data,
    },
  })

  return JSON.parse(response.body)
}

export async function createTestAvailability(
  app: FastifyInstance,
  accessToken: string,
  serviceId: string,
  data: { date: string; startTime: string; endTime: string; capacity: number }
): Promise<{ id: string; serviceId: string; capacity: number }> {
  const response = await app.inject({
    method: 'POST',
    url: `/v1/services/${serviceId}/availabilities`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: data,
  })

  return JSON.parse(response.body)
}

export async function createTestExtraItem(
  app: FastifyInstance,
  accessToken: string,
  serviceId: string,
  data: { name: string; price: number; maxQuantity?: number }
): Promise<{ id: string; serviceId: string; name: string }> {
  const response = await app.inject({
    method: 'POST',
    url: `/v1/services/${serviceId}/extras`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      maxQuantity: 1,
      ...data,
    },
  })

  return JSON.parse(response.body)
}

export interface TestEstablishmentSetup {
  owner: TestUser
  establishmentId: string
  serviceId: string
  availabilityId: string
  extraItemId?: string
}

export async function setupTestEstablishment(
  app: FastifyInstance,
  prefix: string,
  options: { includeExtraItem?: boolean } = {}
): Promise<TestEstablishmentSetup> {
  const owner = await createTestUser(app, {
    email: `owner-${prefix}@example.com`,
    password: 'Test1234!',
    name: `${prefix} Owner`,
  })

  const establishment = await createTestEstablishment(app, owner.accessToken, {
    name: `Test ${prefix} Establishment`,
    address: `123 ${prefix} St`,
  })

  const loginResult = await loginTestUser(app, {
    email: `owner-${prefix}@example.com`,
    password: 'Test1234!',
  })
  owner.accessToken = loginResult.accessToken

  const service = await createTestService(app, owner.accessToken, establishment.id, {
    name: `${prefix} Service`,
    basePrice: 50,
    durationMinutes: 60,
    capacity: 1,
  })

  const availability = await createTestAvailability(app, owner.accessToken, service.id, {
    date: '2025-02-15',
    startTime: '09:00',
    endTime: '10:00',
    capacity: 10,
  })

  const result: TestEstablishmentSetup = {
    owner,
    establishmentId: establishment.id,
    serviceId: service.id,
    availabilityId: availability.id,
  }

  if (options.includeExtraItem) {
    const extraItem = await createTestExtraItem(app, owner.accessToken, service.id, {
      name: `${prefix} Extra`,
      price: 15,
      maxQuantity: 2,
    })
    result.extraItemId = extraItem.id
  }

  return result
}
