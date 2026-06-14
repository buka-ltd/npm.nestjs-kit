import { Global, Module, Inject } from '@nestjs/common'
import { setBaseUrl } from '@keq-request/url'
import { validateStatusCode } from '@keq-request/exception'
import {
  KeqMiddlewareModule,
  KeqMiddlewareConsumer,
} from '@keq-request/nestjs'
import { OpenBaoHttpModule } from '../../apis/open-bao-http/open-bao-http.module'
import { OpenBaoTokenManager } from './open-bao-token.manager'
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './open-bao.module-definition'
import { setOpenBaoToken } from './set-open-bao-token.middleware'
import { formatError } from './request/format-error'
import type { OpenBaoModuleOptions } from './types'

/**
 * OpenBao 核心模块
 *
 * 通过配置的身份认证方式（Token / Userpass / AppRole / Kubernetes）
 * 获取并维持 OpenBao Token，为 OpenBaoHttpClient 提供认证能力。
 *
 * 使用前需在根模块中导入 `KeqModule`：
 *
 * ```ts
 * import { KeqModule } from '@keq-request/nestjs'
 *
 * @Module({
 *   imports: [
 *     KeqModule,
 *     OpenBaoModule.register({
 *       address: 'http://localhost:8200',
 *       auth: { method: 'token', token: 's.xxxxx' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
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
  imports: [
    OpenBaoHttpModule.register({ isGlobal: true }),
  ],
  providers: [OpenBaoTokenManager],
  exports: [OpenBaoTokenManager, OpenBaoHttpModule],
})
export class OpenBaoModule
  extends ConfigurableModuleClass
  implements KeqMiddlewareModule
{
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: OpenBaoModuleOptions,
    private readonly tokenManager: OpenBaoTokenManager,
  ) {
    super()
  }

  configureKeqMiddleware(consumer: KeqMiddlewareConsumer): void {
    consumer
      .apply(
        formatError(),
        setBaseUrl(this.options.address + '/v1/'),
        setOpenBaoToken(() => this.tokenManager.getToken()),
        validateStatusCode(),
      )
      .forRoutes(OpenBaoHttpModule)
  }
}
