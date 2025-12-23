/**
 * Port interface for password hashing operations.
 * Abstracts the underlying hashing algorithm (argon2, bcrypt, etc.)
 */
export interface PasswordHasherPort {
  /**
   * Hash a plain text password
   */
  hash(password: string): Promise<string>

  /**
   * Verify a password against a hash
   */
  verify(hash: string, password: string): Promise<boolean>

  /**
   * Check if a hash needs to be rehashed (algorithm upgrade, cost change)
   */
  needsRehash(hash: string): Promise<boolean>
}
