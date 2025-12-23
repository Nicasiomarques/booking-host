// New port-based adapter
export { JwtTokenProviderAdapter } from './jwt-token-provider.adapter.js'

// Legacy exports (kept for backward compatibility)
/** @deprecated Use JwtTokenProviderAdapter instead */
export { JwtAdapter, jwtAdapter } from './jwt.adapter.js'
/** @deprecated Use TokenPayload from #application/ports instead */
export type { TokenPayload } from './jwt.adapter.js'
