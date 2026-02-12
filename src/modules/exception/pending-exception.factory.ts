import { HttpStatus } from '@nestjs/common'
import { type ExceptionDetail } from '@buka/exception'
import { ErrorCategory } from '@buka/error-codes'
import { HttpException } from './http-exception.js'
import { ErrorCodeRegistry } from './error-code.registry.js'

/**
 * 异常选项 - 使用固定消息
 */
export interface ExceptionOptionsWithMessage {
  /** 序列号 (0-32767) */
  sequenceId: number
  /** 默认错误消息 */
  message: string
  /** HTTP状态码 (可选，使用默认值) */
  httpStatus?: HttpStatus
  /** 错误描述，用于错误码查询接口展示详细信息和解决方案 */
  description?: string
}

/**
 * 异常选项 - 使用消息工厂函数
 *
 * @example
 * ```typescript
 * static readonly NotFound = BusinessException({
 *   sequenceId: 1,
 *   messageFactory: (userId: string) => `User ${userId} not found`,
 * })
 *
 * throw new UserExceptions.NotFound('123')
 * ```
 */
export interface ExceptionOptionsWithFactory<TArgs extends unknown[]> {
  /** 序列号 (0-32767) */
  sequenceId: number
  /** 消息工厂函数，用于生成错误消息 */
  messageFactory: (...args: TArgs) => string
  /** HTTP状态码 (可选，使用默认值) */
  httpStatus?: HttpStatus
  /** 错误描述，用于错误码查询接口展示详细信息和解决方案 */
  description?: string
}

export type ExceptionOptions<TArgs extends unknown[] = []>
  = | ExceptionOptionsWithMessage
    | ExceptionOptionsWithFactory<TArgs>

/**
 * 基础异常构造器类型 - 使用固定消息
 */
export type ExceptionConstructor = new (
  message?: string,
  details?: ExceptionDetail | ExceptionDetail[]
) => HttpException

/**
 * 自定义参数异常构造器类型 - 使用消息工厂
 */
export type ExceptionConstructorWithArgs<TArgs extends unknown[]> = new (
  ...args: [...TArgs, details?: ExceptionDetail | ExceptionDetail[]]
) => HttpException

/**
 * 待绑定的异常类
 *
 * 如果用户忘记添加 @ModuleExceptions 装饰器直接使用，会抛出友好的错误提示
 */
export class PendingException extends HttpException {
  /** 标记为待绑定 */
  static readonly __pending = true

  /** 异常类别 */
  static category: ErrorCategory
  /** 序列号 */
  static sequenceId: number
  /** 默认消息 (固定消息模式) */
  static defaultMessage?: string
  /** 消息工厂函数 (工厂模式) */
  static messageFactory?: (...args: unknown[]) => string
  /** HTTP状态码 */
  static defaultHttpStatus: HttpStatus
  /** 错误描述 */
  static defaultDescription?: string

  constructor() {
    const ctor = new.target
    const messageExample = ctor.messageFactory
      ? 'messageFactory: (id: string) => `Resource ${id} not found`,'
      : `message: '${ctor.defaultMessage ?? 'Error message'}',`

    const errorMessage = 'Cannot instantiate PendingException directly.\n'
      + 'You must use @ModuleExceptions decorator on the class containing this exception.\n'
      + '\n'
      + 'Example:\n'
      + '  @ModuleExceptions({ moduleId: 1 })\n'
      + '  export class YourExceptions {\n'
      + `    static readonly YourError = ${getCategoryFactoryName(ctor.category)}({\n`
      + `      sequenceId: ${ctor.sequenceId},\n`
      + `      ${messageExample}\n`
      + '    })\n'
      + '  }'

    // 调用 super 但立即抛出错误
    super({
      message: errorMessage,
      category: ErrorCategory.SYSTEM,
      moduleId: 0,
      sequenceId: 0,
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    })

    throw new Error(errorMessage)
  }
}

function getCategoryFactoryName(category: ErrorCategory): string {
  const map: Record<ErrorCategory, string> = {
    [ErrorCategory.SYSTEM]: 'SystemException',
    [ErrorCategory.BUSINESS]: 'BusinessException',
    [ErrorCategory.VALIDATION]: 'ValidationException',
    [ErrorCategory.THIRD_PARTY]: 'ThirdPartyException',
    [ErrorCategory.AUTH]: 'AuthException',
    [ErrorCategory.RATE_LIMIT]: 'RateLimitException',
    [ErrorCategory.DEGRADE]: 'DegradeException',
    [ErrorCategory.CONFLICT]: 'ConflictException',
    [ErrorCategory.FEATURE]: 'FeatureException',
  }
  return map[category] || 'Exception'
}

const CATEGORY_HTTP_STATUS_MAP: Record<ErrorCategory, HttpStatus> = {
  [ErrorCategory.SYSTEM]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCategory.BUSINESS]: HttpStatus.BAD_REQUEST,
  [ErrorCategory.VALIDATION]: HttpStatus.BAD_REQUEST,
  [ErrorCategory.THIRD_PARTY]: HttpStatus.BAD_GATEWAY,
  [ErrorCategory.AUTH]: HttpStatus.UNAUTHORIZED,
  [ErrorCategory.RATE_LIMIT]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCategory.DEGRADE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCategory.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCategory.FEATURE]: HttpStatus.FORBIDDEN,
}

/**
 * 检查是否为待绑定的异常类
 */
export function isPendingException(value: unknown): value is typeof PendingException {
  return (
    typeof value === 'function'
    && '__pending' in value
    && (value as typeof PendingException).__pending === true
  )
}

/**
 * 创建真正的异常类
 */
export function createExceptionClass(
  moduleId: number,
  moduleName: string,
  propertyName: string,
  pendingClass: typeof PendingException,
): ExceptionConstructor {
  const { category, sequenceId, defaultMessage, messageFactory, defaultHttpStatus, defaultDescription } = pendingClass

  // 根据是否有 messageFactory 创建不同的异常类
  if (messageFactory) {
    const factory = messageFactory
    // 使用消息工厂模式
    class GeneratedException extends HttpException {
      constructor(...args: unknown[]) {
        // 最后一个参数可能是 details
        let details: ExceptionDetail | ExceptionDetail[] | undefined
        let factoryArgs = args

        if (args.length > 0) {
          const lastArg = args[args.length - 1]
          if (typeof lastArg === 'object' && lastArg !== null && !Array.isArray(lastArg)) {
            // 检查是否是 ExceptionDetail
            if ('field' in lastArg || 'reason' in lastArg || 'code' in lastArg) {
              details = lastArg as unknown as ExceptionDetail
              factoryArgs = args.slice(0, -1)
            }
          } else if (Array.isArray(lastArg) && lastArg.length > 0 && typeof lastArg[0] === 'object') {
            details = lastArg as ExceptionDetail[]
            factoryArgs = args.slice(0, -1)
          }
        }

        const message = factory(...factoryArgs)
        super({
          message,
          category,
          moduleId,
          sequenceId,
          httpStatus: defaultHttpStatus,
          details,
        })
      }
    }

    Object.defineProperty(GeneratedException, 'name', {
      value: `${moduleName}.${propertyName}`,
      writable: false,
    })

    const registry = ErrorCodeRegistry.getInstance()
    registry.register(
      { category, moduleId, sequenceId },
      `${moduleName}.${propertyName}`,
      defaultDescription,
    )

    return GeneratedException as unknown as ExceptionConstructor
  }

  // 使用固定消息模式
  class GeneratedException extends HttpException {
    constructor(message?: string, details?: ExceptionDetail | ExceptionDetail[]) {
      super({
        message: message ?? defaultMessage ?? 'Unknown error',
        category,
        moduleId,
        sequenceId,
        httpStatus: defaultHttpStatus,
        details,
      })
    }
  }

  // 设置类名便于调试
  Object.defineProperty(GeneratedException, 'name', {
    value: `${moduleName}.${propertyName}`,
    writable: false,
  })

  // 注册并校验唯一性
  const registry = ErrorCodeRegistry.getInstance()
  registry.register(
    { category, moduleId, sequenceId },
    `${moduleName}.${propertyName}`,
    defaultDescription,
  )

  return GeneratedException as ExceptionConstructor
}

/**
 * 检查选项是否使用消息工厂
 */
function hasMessageFactory<TArgs extends unknown[]>(
  options: ExceptionOptions<TArgs>,
): options is ExceptionOptionsWithFactory<TArgs> {
  return 'messageFactory' in options
}

/**
 * 创建异常工厂
 *
 * 支持两种模式:
 * 1. 固定消息模式: 使用 `message` 选项
 * 2. 工厂模式: 使用 `messageFactory` 选项，支持自定义构造参数
 */
function createPendingExceptionFactory(
  category: ErrorCategory,
  defaultHttpStatus: HttpStatus,
): {
  <TArgs extends unknown[]>(options: ExceptionOptionsWithFactory<TArgs>): ExceptionConstructorWithArgs<TArgs>
  (options: ExceptionOptionsWithMessage): ExceptionConstructor
} {
  return function <TArgs extends unknown[]>(options: ExceptionOptions<TArgs>): ExceptionConstructor {
    const { sequenceId, httpStatus = defaultHttpStatus } = options

    // 校验参数范围
    if (sequenceId < 0 || sequenceId >= 2 ** 15) {
      throw new Error(`Invalid sequence ID: ${sequenceId}, must be between 0 and ${2 ** 15 - 1}`)
    }

    if (hasMessageFactory(options)) {
      // 工厂模式
      const factoryOptions = options
      class PendingExceptionImpl extends PendingException {
        static override readonly __pending = true as const
        static override readonly category = category
        static override readonly sequenceId = sequenceId
        static override readonly messageFactory = factoryOptions.messageFactory as (...args: unknown[]) => string
        static override readonly defaultHttpStatus = httpStatus
        static override readonly defaultDescription = factoryOptions.description
      }
      return PendingExceptionImpl as unknown as ExceptionConstructor
    }

    // 固定消息模式
    const messageOptions = options
    class PendingExceptionImpl extends PendingException {
      static override readonly __pending = true as const
      static override readonly category = category
      static override readonly sequenceId = sequenceId
      static override readonly defaultMessage = messageOptions.message
      static override readonly defaultHttpStatus = httpStatus
      static override readonly defaultDescription = messageOptions.description ?? messageOptions.message
    }

    return PendingExceptionImpl as unknown as ExceptionConstructor
  }
}

/**
 * 系统异常
 *
 * 用于系统级错误，如数据库连接失败、内部服务错误等
 *
 * @example
 * ```typescript
 * @ModuleExceptions({ moduleId: 1 })
 * export class UserExceptions {
 *   static readonly DatabaseError = SystemException({
 *     sequenceId: 1,
 *     message: 'Database connection failed',
 *   })
 * }
 * ```
 */
export const SystemException = createPendingExceptionFactory(
  ErrorCategory.SYSTEM,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.SYSTEM],
)

/**
 * 业务异常
 *
 * 用于业务逻辑错误，如资源不存在、余额不足等
 *
 * @example
 * ```typescript
 * @ModuleExceptions({ moduleId: 1 })
 * export class UserExceptions {
 *   // 固定消息模式
 *   static readonly NotFound = BusinessException({
 *     sequenceId: 1,
 *     message: 'User not found',
 *   })
 *
 *   // 工厂模式 - 自定义构造参数
 *   static readonly NotFoundById = BusinessException({
 *     sequenceId: 2,
 *     messageFactory: (userId: string) => `User ${userId} not found`,
 *   })
 * }
 *
 * // 使用默认消息
 * throw new UserExceptions.NotFound()
 *
 * // 覆盖默认消息
 * throw new UserExceptions.NotFound('Custom message')
 *
 * // 使用工厂模式
 * throw new UserExceptions.NotFoundById('123')
 * ```
 */
export const BusinessException = createPendingExceptionFactory(
  ErrorCategory.BUSINESS,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.BUSINESS],
)

/**
 * 验证异常
 *
 * 用于参数校验错误
 */
export const ValidationException = createPendingExceptionFactory(
  ErrorCategory.VALIDATION,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.VALIDATION],
)

/**
 * 第三方服务异常
 *
 * 用于第三方服务调用失败
 */
export const ThirdPartyException = createPendingExceptionFactory(
  ErrorCategory.THIRD_PARTY,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.THIRD_PARTY],
)

/**
 * 认证异常
 *
 * 用于认证/授权相关错误
 */
export const AuthException = createPendingExceptionFactory(
  ErrorCategory.AUTH,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.AUTH],
)

/**
 * 限流异常
 *
 * 用于请求被限流
 */
export const RateLimitException = createPendingExceptionFactory(
  ErrorCategory.RATE_LIMIT,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.RATE_LIMIT],
)

/**
 * 降级异常
 *
 * 用于服务降级场景
 */
export const DegradeException = createPendingExceptionFactory(
  ErrorCategory.DEGRADE,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.DEGRADE],
)

/**
 * 冲突异常
 *
 * 用于资源状态冲突
 */
export const ConflictException = createPendingExceptionFactory(
  ErrorCategory.CONFLICT,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.CONFLICT],
)

/**
 * 功能不可用异常
 *
 * 用于功能未开放或权限不足
 */
export const FeatureException = createPendingExceptionFactory(
  ErrorCategory.FEATURE,
  CATEGORY_HTTP_STATUS_MAP[ErrorCategory.FEATURE],
)
