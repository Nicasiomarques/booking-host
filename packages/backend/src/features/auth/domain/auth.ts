export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
  birthDate?: string
  address?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
  }
}

