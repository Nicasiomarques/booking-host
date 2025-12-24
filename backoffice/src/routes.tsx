import { lazy } from 'solid-js'
import { Route } from '@solidjs/router'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Establishments = lazy(() => import('./pages/Establishments'))
const EstablishmentDetails = lazy(() => import('./pages/EstablishmentDetails'))
const Services = lazy(() => import('./pages/Services'))
const NotFound = lazy(() => import('./pages/NotFound'))
const MainLayout = lazy(() => import('./components/layout/MainLayout'))

export const routes = (
  <>
    <Route path="/login" component={Login} />
    <Route path="/" component={MainLayout}>
      <Route path="/" component={Dashboard} />
      <Route path="/establishments" component={Establishments} />
      <Route path="/establishments/:id" component={EstablishmentDetails} />
      <Route path="/establishments/:establishmentId/services" component={Services} />
    </Route>
    <Route path="*" component={NotFound} />
  </>
)
