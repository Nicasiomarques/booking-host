export interface PasswordHasherPort {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
  needsRehash(hash: string): Promise<boolean>
}

