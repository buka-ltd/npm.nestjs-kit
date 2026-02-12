import { Global, Module, type Provider } from '@nestjs/common'
import { KeqRequest } from 'keq'
import { setBaseUrl } from '@keq-request/url'
import { validateStatusCode } from '@keq-request/exception'
import { OpenBaoHttpClient } from '../../apis/open-bao-http/open-bao-http.client'
import { OpenBaoTokenManager } from './open-bao-token.manager'
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './open-bao.module-definition'
import { setOpenBaoToken } from './set-open-bao-token.middleware'
import type { OpenBaoModuleOptions } from './types'

/**
 * 内部 KeqRequest 注入 Token
 */
const OPEN_BAO_KEQ_REQUEST = Symbol('OpenBaoKeqRequest')

/**
 * KeqRequest Provider：配置 baseUrl、动态 Token 中间件 和 状态码校验
 */
const KEQ_REQUEST_PROVIDER: Provider = {
  provide: OPEN_BAO_KEQ_REQUEST,
  useFactory: (options: OpenBaoModuleOptions, tokenManager: OpenBaoTokenManager): KeqRequest => {
    const request = new KeqRequest()

    request.use(setBaseUrl(options.address + '/v1/'))
    request.use(setOpenBaoToken(() => tokenManager.getToken()))
    request.use(validateStatusCode())

    return request
  },
  inject: [MODULE_OPTIONS_TOKEN, OpenBaoTokenManager],
}

/**
 * OpenBaoHttpClient Provider：注入已配置的 KeqRequest
 */
const HTTP_CLIENT_PROVIDER: Provider = {
  provide: OpenBaoHttpClient,
  useFactory: (request: KeqRequest) => new OpenBaoHttpClient(request),
  inject: [OPEN_BAO_KEQ_REQUEST],
}

/**
 * OpenBao 核心模块
 *
 * 通过配置的身份认证方式（Token / Userpass / AppRole / Kubernetes）
 * 获取并维持 OpenBao Token，为 OpenBaoHttpClient 提供认证能力。
 *
 * @example
 * ```ts
 * // Token 认证
 * OpenBaoModule.register({
 *   address: 'http://localhost:8200',
 *   auth: { method: 'token', token: 's.xxxxx' },
 * })
 *
 * // Userpass 认证
 * OpenBaoModule.register({
 *   address: 'http://localhost:8200',
 *   auth: { method: 'userpass', username: 'admin', password: 'secret' },
 * })
 *
 * // AppRole 认证
 * OpenBaoModule.register({
 *   address: 'http://localhost:8200',
 *   auth: { method: 'approle', roleId: 'xxx', secretId: 'yyy' },
 * })
 *
 * // Kubernetes 认证
 * OpenBaoModule.register({
 *   address: 'http://localhost:8200',
 *   auth: { method: 'kubernetes', role: 'my-role' },
 * })
 * ```
 */
@Global()
@Module({
  providers: [
    OpenBaoTokenManager,
    KEQ_REQUEST_PROVIDER,
    HTTP_CLIENT_PROVIDER,
  ],
  exports: [OpenBaoTokenManager, OpenBaoHttpClient],
})
export class OpenBaoModule extends ConfigurableModuleClass {}

