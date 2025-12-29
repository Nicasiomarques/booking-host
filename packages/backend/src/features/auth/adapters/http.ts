import authEndpoints from './endpoints.js'
import { createFeaturePlugin } from '#shared/adapters/http/utils/plugin-factory.js'

export default createFeaturePlugin(authEndpoints, '/v1/auth')

