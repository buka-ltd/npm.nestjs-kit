// 常量
export * from './constants/index.js'

// 注册中心
export { ErrorCodeRegistry } from './error-code.registry.js'

// 错误码查询
export { ErrorCodeController } from './error-code.controller.js'
export * from './dto/index.js'

// 异常基类
export { HttpException } from './http-exception.js'
export type { HttpExceptionOptions } from './http-exception.js'

// 异常工厂 (配合 @ModuleException 装饰器使用)
export {
  SystemException,
  BusinessException,
  ValidationException,
  ThirdPartyException,
  AuthException,
  RateLimitException,
  DegradeException,
  ConflictException,
  FeatureException,
} from './pending-exception.factory.js'

export type {
  ExceptionOptions,
  ExceptionOptionsWithMessage,
  ExceptionOptionsWithFactory,
  ExceptionConstructor,
  ExceptionConstructorWithArgs,
} from './pending-exception.factory.js'

export { PendingException } from './pending-exception.factory.js'

// 异常模块装饰器
export {
  ModuleExceptions,
  getExceptionModuleId,
} from './decorators/exception-module.decorator.js'
export type {
  ExceptionModuleOptions as ModuleExceptionsOptions,
  ResolveExceptions,
} from './decorators/exception-module.decorator.js'

// NestJS 模块
export { ExceptionModule } from './exception.module.js'
export type { ExceptionModuleOptions as ExceptionNestModuleOptions } from './exception.module-definition.js'

// 内置异常 (moduleId: 0)
export { BukaExceptions } from './buka.exceptions.js'

// 过滤器
export { ErrorCodeExceptionFilter } from './filters/exception.filter.js'

// Re-export from @buka/exception for convenience
export { type ExceptionDetail } from '@buka/exception'

// Re-export from @buka/error-codes for convenience
export { ErrorCode, ErrorCategory, Base32, type ErrorCodeOptions } from '@buka/error-codes'
