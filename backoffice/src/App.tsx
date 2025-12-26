import { Suspense } from 'solid-js'
import { Router } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { routes } from './routes'
import { ToastContainer, Spinner } from '@/components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      retryDelay: 0,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div class="min-h-screen flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <Router>{routes}</Router>
      </Suspense>
      <ToastContainer />
    </QueryClientProvider>
  )
}

export default App
