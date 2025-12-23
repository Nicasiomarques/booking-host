import argon2 from 'argon2'
import { argon2Options } from '#config/index.js'

export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, argon2Options)
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }

  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, argon2Options)
  }
}

export const passwordService = new PasswordService()
