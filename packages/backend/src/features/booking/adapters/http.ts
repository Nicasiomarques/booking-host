import bookingEndpoints from './endpoints.js'
import { createFeaturePlugin } from '#shared/adapters/http/utils/plugin-factory.js'

export default createFeaturePlugin(bookingEndpoints, '/v1')

