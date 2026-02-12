import type { KeqMiddleware } from 'keq'

/**
 * Paths that don't require authentication token.
 *
 * These endpoints can be called without X-Vault-Token header:
 * - `/auth/<mount>/login*` - Auth login endpoints (userpass, approle, kubernetes, etc.)
 * - `/sys/health` - Health check endpoint
 * - `/sys/init` - Initialization status and operation
 * - `/sys/seal-status` - Seal status check
 * - `/sys/unseal` - Unseal operation (uses unseal key)
 * - `/sys/leader` - Leader status
 * - `/sys/generate-root/*` - Root token generation (uses unseal key)
 * - `/sys/rekey/*` - Rekey operations (uses unseal key)
 */
const UNAUTHENTICATED_PATTERNS: RegExp[] = [
  /^\/auth\/[^/]+\/login/,
  /^\/sys\/health$/,
  /^\/sys\/init$/,
  /^\/sys\/seal-status$/,
  /^\/sys\/unseal$/,
  /^\/sys\/leader$/,
  /^\/sys\/generate-root(\/|$)/,
  /^\/sys\/rekey(\/|$)/,
]

/**
 * Check if a pathname matches any unauthenticated pattern
 */
function isUnauthenticatedPath(pathname: string): boolean {
  return UNAUTHENTICATED_PATTERNS.some((pattern) => pattern.test(pathname))
}

/**
 * Create OpenBao Token middleware
 *
 * Automatically adds `X-Vault-Token` header to requests, excluding unauthenticated endpoints.
 *
 * @param getToken Callback function to get the current valid token
 * @returns keq middleware
 *
 * @example
 * ```ts
 * const request = new KeqRequest()
 * request.use(setOpenBaoToken(() => tokenManager.getToken()))
 * ```
 */
export function setOpenBaoToken(getToken: () => string): KeqMiddleware {
  const middleware: KeqMiddleware = async (ctx, next) => {
    const pathname = ctx.options.module?.pathname ?? ''

    // Skip unauthenticated endpoints
    if (!isUnauthenticatedPath(pathname)) {
      ctx.request.headers.set('X-Vault-Token', getToken())
    }

    await next()
  }

  middleware.__keqMiddlewareName__ = 'setOpenBaoToken'
  return middleware
}
