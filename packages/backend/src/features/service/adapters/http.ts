import serviceEndpoints from './endpoints.js'
import { createFeaturePlugin } from '#shared/adapters/http/utils/plugin-factory.js'

export default createFeaturePlugin(serviceEndpoints, '/v1')

