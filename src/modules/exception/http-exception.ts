import { HttpStatus } from '@nestjs/common'
import { Exception, type ExceptionOptions } from '@buka/exception'

export interface HttpExceptionOptions extends ExceptionOptions {
  /** HTTP 状态码 */
  httpStatus: HttpStatus
}

/**
 * NestJS 业务异常基类
 *
 * 继承自 @buka/exception 的 Exception，添加了 HTTP 状态码支持
 *
 * @example
 * ```typescript
 * class UserNotFoundException extends BukaException {
 *   constructor(userId: string) {
 *     super({
 *       message: `User ${userId} not found`,
 *       category: ErrorCategory.BUSINESS,
 *       moduleId: 10,
 *       sequenceId: 1,
 *       httpStatus: HttpStatus.NOT_FOUND,
 *     })
 *   }
 * }
 * ```
 */
export class HttpException extends Exception {
  /** HTTP 状态码 */
  readonly httpStatus: HttpStatus

  constructor(options: HttpExceptionOptions) {
    super(options)
    this.httpStatus = options.httpStatus
  }
}
