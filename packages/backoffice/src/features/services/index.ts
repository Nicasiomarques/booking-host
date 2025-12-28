// Services
export { serviceService } from './services/service.service'
export type { Service, CreateServiceData, UpdateServiceData } from './services/service.service'

// Extra Items
export { extraItemService } from './services/extra-item.service'
export type {
  ExtraItem,
  CreateExtraItemData,
  UpdateExtraItemData,
} from './services/extra-item.service'

// Hooks
export {
  useServices,
  useService,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from './hooks/useServices'

export {
  useExtraItems,
  useCreateExtraItem,
  useUpdateExtraItem,
  useDeleteExtraItem,
} from './hooks/useExtraItems'

// Components
export { ServiceForm, type ServiceFormData } from './components/ServiceForm'
export { ServiceModal, CreateServiceModal, EditServiceModal } from './components/ServiceModal'
export { DeleteServiceModal } from './components/DeleteServiceModal'
export { ExtraItemForm, type ExtraItemFormData } from './components/ExtraItemForm'
export { ExtraItemsList } from './components/ExtraItemsList'
