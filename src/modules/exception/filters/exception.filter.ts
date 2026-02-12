import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Exception } from '@buka/exception'
import { ErrorCode, ErrorCategory } from '@buka/error-codes'
import { ErrorCodeRegistry } from '../error-code.registry.js'
import { HttpException as BukaHttpException } from '../http-exception.js'

interface HttpResponse {
  status(code: number): this
  send(body: unknown): void
}

// 映射 HTTP 状态码到预留错误码 (moduleId=0 为系统保留)
const HTTP_STATUS_ERROR_MAPPING: Record<number, { category: ErrorCategory; sequenceId: number | string }> = {
  400: { category: ErrorCategory.VALIDATION, sequenceId: '400' },
  401: { category: ErrorCategory.AUTH, sequenceId: '401' },
  403: { category: ErrorCategory.AUTH, sequenceId: '403' },
  404: { category: ErrorCategory.BUSINESS, sequenceId: '404' },
  409: { category: ErrorCategory.CONFLICT, sequenceId: '409' },
  415: { category: ErrorCategory.VALIDATION, sequenceId: '415' },
  429: { category: ErrorCategory.RATE_LIMIT, sequenceId: '429' },
  500: { category: ErrorCategory.SYSTEM, sequenceId: '500' },
  502: { category: ErrorCategory.THIRD_PARTY, sequenceId: '502' },
  503: { category: ErrorCategory.DEGRADE, sequenceId: '503' },
  504: { category: ErrorCategory.THIRD_PARTY, sequenceId: '504' },
}

/**
 * 全局异常过滤器
 *
 * 统一处理所有异常，转换为标准错误码格式响应
 */
@Catch()
export class ErrorCodeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<HttpResponse>()

    let status: number
    let body: Record<string, unknown>

    if (exception instanceof BukaHttpException) {
      // 处理自定义业务异常 (NestJS 扩展)
      status = exception.httpStatus
      body = this.handleException(exception)
    } else if (exception instanceof Exception) {
      // 处理 @buka/exception 基础异常
      status = HttpStatus.INTERNAL_SERVER_ERROR
      body = this.handleException(exception)
    } else if (exception instanceof HttpException) {
      // 处理 NestJS 内置 HTTP 异常
      status = exception.getStatus()
      body = this.handleHttpException(exception)
    } else {
      // 处理未知异常
      status = HttpStatus.INTERNAL_SERVER_ERROR
      body = this.handleUnknownException(exception)
    }

    response.status(status).send(body)
  }

  private handleException(exception: Exception): Record<string, unknown> {
    const registry = ErrorCodeRegistry.getInstance()
    const errorCode = new ErrorCode({
      category: exception.category,
      systemId: registry.getSystemId(),
      moduleId: exception.moduleId,
      sequenceId: exception.sequenceId,
    })

    return {
      error: {
        code: errorCode.toString(),
        message: exception.message,
        details: exception.details,
      },
    }
  }

  private handleHttpException(exception: HttpException): Record<string, unknown> {
    const status = exception.getStatus()
    const registry = ErrorCodeRegistry.getInstance()
    const systemId = registry.getSystemId()

    const config = HTTP_STATUS_ERROR_MAPPING[status] ?? { category: ErrorCategory.SYSTEM, sequenceId: status }
    const errorCode = new ErrorCode({
      category: config.category,
      systemId,
      moduleId: 0,
      sequenceId: config.sequenceId,
    })

    const exceptionResponse = exception.getResponse()
    const message
      = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message

    return {
      error: {
        code: errorCode.toString(),
        message,
        details: [],
      },
    }
  }

  private handleUnknownException(exception: unknown): Record<string, unknown> {
    const registry = ErrorCodeRegistry.getInstance()
    const errorCode = new ErrorCode({
      category: ErrorCategory.SYSTEM,
      systemId: registry.getSystemId(),
      moduleId: 0,
      sequenceId: 500,
    })

    // 记录未知异常
    console.error('Unhandled exception:', exception)

    return {
      error: {
        code: errorCode.toString(),
        message: 'Internal Server Error',
        details: [],
      },
    }
  }
}
