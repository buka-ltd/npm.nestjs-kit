import { Global, Inject, Module, type OnModuleInit } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { Base32 } from '@buka/error-codes'
import { ErrorCodeController } from './error-code.controller.js'
import { ErrorCodeRegistry } from './error-code.registry.js'
import { ErrorCodeExceptionFilter } from './filters/exception.filter.js'
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, type ExceptionModuleOptions } from './exception.module-definition.js'


/**
 * 错误码模块
 *
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { ExceptionModule } from '@buka/nestjs-kit';
 *
 * @Module({
 *   imports: [
 *     ExceptionModule.register({
 *       systemId: '1001', // 你的系统ID，支持 Base32 字符串或十进制数字
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  controllers: [ErrorCodeController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ErrorCodeExceptionFilter,
    },
  ],
})
export class ExceptionModule extends ConfigurableModuleClass implements OnModuleInit {
  @Inject(MODULE_OPTIONS_TOKEN)
  private readonly options!: ExceptionModuleOptions

  onModuleInit(): void {
    const systemId = typeof this.options.systemId === 'string'
      ? Base32.decode(this.options.systemId)
      : this.options.systemId
    ErrorCodeRegistry.getInstance().setSystemId(systemId)
  }
}
