// Services
export { serviceService } from './services/service.service'
export type { Service, CreateServiceData, UpdateServiceData } from './services/service.service'

// Hooks
export {
  useServices,
  useService,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from './hooks/useServices'

// Components
export { ServiceForm, type ServiceFormData } from './components/ServiceForm'
export { ServiceModal, CreateServiceModal, EditServiceModal } from './components/ServiceModal'
export { DeleteServiceModal } from './components/DeleteServiceModal'
