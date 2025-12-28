import establishmentEndpoints from '../endpoints.js'
import { createFeaturePlugin } from '#shared/adapters/http/utils/plugin-factory.js'

export default createFeaturePlugin(establishmentEndpoints, '/v1/establishments')

