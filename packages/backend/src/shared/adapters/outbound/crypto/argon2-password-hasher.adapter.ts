import argon2 from 'argon2'
import type { PasswordHasherPort } from '#shared/application/ports/index.js'
import { argon2Options } from '#config/index.js'

/**
 * Argon2 implementation of the PasswordHasherPort.
 * Uses the argon2 library with configuration from config/argon2.config.ts
 */
export const createPasswordHasher = (): PasswordHasherPort => ({
  async hash(password: string): Promise<string> {
    return argon2.hash(password, argon2Options)
  },

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  },

  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, argon2Options)
  },
})
