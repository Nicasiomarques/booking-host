import { type Component, createSignal, Show, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { z } from 'zod'
import { api, getAccessToken } from '@/lib/api'
import { authStore } from '@/stores'
import { Button, Input, Alert, Card, CardBody } from '@/components/ui'
import { APP_NAME } from '@/lib/constants'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

interface LoginResponse {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    establishmentRoles: Array<{
      establishmentId: string
      role: 'OWNER' | 'STAFF'
    }>
  }
}

const Login: Component = () => {
  const navigate = useNavigate()
  const { login } = authStore

  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [apiError, setApiError] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)

  // Redirect if already logged in
  onMount(() => {
    if (getAccessToken()) {
      navigate('/', { replace: true })
    }
  })

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setErrors({})
    setApiError('')

    // Validate
    const result = loginSchema.safeParse({ email: email(), password: password() })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setIsLoading(true)

    try {
      const response = await api.post<LoginResponse>('/v1/auth/login', {
        email: email(),
        password: password(),
      })

      login(response.user, response.accessToken)
      navigate('/', { replace: true })
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <Card class="w-full max-w-md">
        <CardBody>
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold">{APP_NAME}</h1>
            <p class="text-base-content/60 mt-1">Sign in to your account</p>
          </div>

          <Show when={apiError()}>
            <Alert variant="error" class="mb-4">
              {apiError()}
            </Alert>
          </Show>

          <form onSubmit={handleSubmit} class="space-y-4">
            <div class="form-control">
              <label for="email" class="label">
                <span class="label-text">Email</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                placeholder="email@example.com"
                error={!!errors().email}
                autocomplete="email"
              />
              <Show when={errors().email}>
                <span class="label-text-alt text-error">{errors().email}</span>
              </Show>
            </div>

            <div class="form-control">
              <label for="password" class="label">
                <span class="label-text">Password</span>
              </label>
              <Input
                id="password"
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="********"
                error={!!errors().password}
                autocomplete="current-password"
              />
              <Show when={errors().password}>
                <span class="label-text-alt text-error">{errors().password}</span>
              </Show>
            </div>

            <Button type="submit" class="w-full" loading={isLoading()}>
              Sign In
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

export default Login
