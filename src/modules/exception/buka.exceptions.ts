import { ModuleExceptions } from './decorators/exception-module.decorator.js'
import {
  AuthException,
  BusinessException,
  ConflictException,
  DegradeException,
  RateLimitException,
  SystemException,
  ThirdPartyException,
  ValidationException,
} from './pending-exception.factory.js'

/**
 * 内置异常定义（moduleId: 0）
 *
 * 与 ErrorCodeExceptionFilter 中 HTTP 状态码映射表一一对应。
 * 用户可以直接 `throw new BukaExceptions.BadRequest()` 来使用这些内置错误码，
 * 而不必依赖 NestJS 内置 HttpException 被 filter 隐式映射。
 */
@ModuleExceptions({ moduleId: 0 })
export class BukaExceptions {
  // VALIDATION 类
  static readonly BadRequest = ValidationException({ sequenceId: 400, message: 'Bad Request' })
  static readonly UnsupportedMediaType = ValidationException({ sequenceId: 415, message: 'Unsupported Media Type' })

  // AUTH 类
  static readonly Unauthorized = AuthException({ sequenceId: 401, message: 'Unauthorized' })
  static readonly Forbidden = AuthException({ sequenceId: 403, message: 'Forbidden' })

  // BUSINESS 类
  static readonly NotFound = BusinessException({ sequenceId: 404, message: 'Not Found' })

  // CONFLICT 类
  static readonly Conflict = ConflictException({ sequenceId: 409, message: 'Conflict' })

  // RATE_LIMIT 类
  static readonly TooManyRequests = RateLimitException({ sequenceId: 429, message: 'Too Many Requests' })

  // SYSTEM 类
  static readonly InternalServerError = SystemException({ sequenceId: 500, message: 'Internal Server Error' })

  // THIRD_PARTY 类
  static readonly BadGateway = ThirdPartyException({ sequenceId: 502, message: 'Bad Gateway' })
  static readonly GatewayTimeout = ThirdPartyException({ sequenceId: 504, message: 'Gateway Timeout' })

  // DEGRADE 类
  static readonly ServiceUnavailable = DegradeException({ sequenceId: 503, message: 'Service Unavailable' })
}
