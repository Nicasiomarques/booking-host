import type { Component } from 'solid-js'
import { A } from '@solidjs/router'
import { Button } from '@/components/ui'

const NotFound: Component = () => {
  return (
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="text-center">
        <h1 class="text-9xl font-bold text-primary">404</h1>
        <p class="text-2xl font-semibold mt-4">Page Not Found</p>
        <p class="text-base-content/60 mt-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div class="mt-6">
          <A href="/">
            <Button>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Button>
          </A>
        </div>
      </div>
    </div>
  )
}

export default NotFound
