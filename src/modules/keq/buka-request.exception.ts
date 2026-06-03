import { RequestException } from 'keq'
import { ErrorCode } from '@buka/error-codes'
import type { ExceptionDetail } from '@buka/exception'

export interface BukaRequestExceptionOptions {
  code: string
  details?: ExceptionDetail[]
  response?: Response
  fatal?: boolean
}

export class BukaRequestException extends RequestException {
  readonly code: string
  readonly errorCode: ErrorCode
  readonly details: ExceptionDetail[]

  constructor(statusCode: number, message: string, options: BukaRequestExceptionOptions) {
    super(statusCode, message, { response: options.response, fatal: options.fatal })
    this.code = options.code
    this.errorCode = ErrorCode.fromString(options.code)
    this.details = options.details ?? []
  }
}
