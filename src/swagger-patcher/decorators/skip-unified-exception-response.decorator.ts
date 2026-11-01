import { ApiExtension } from '@nestjs/swagger'
import { SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION } from '../constants.js'

/**
 * 跳过统一异常响应（`SwaggerPatcher.unifyExceptionResponses`）
 *
 * 标记在 controller 方法上时，仅该 operation 不被覆写/插入 `ExceptionResponse`；
 * 标记在 controller 类上时，该类所有 operation 均跳过。
 *
 * 用于错误响应遵循其他规范、不符合 Buka 统一信封的端点（如 OAuth2 token、
 * 健康检查）。被跳过的 operation 需要自行通过 `@ApiResponse` 声明错误响应。
 *
 * @example
 * ```typescript
 * @Post('token')
 * @SkipUnifiedExceptionResponse()
 * @ApiResponse({ status: 400, type: OAuth2ErrorResponseDto })
 * exchangeToken() {}
 * ```
 */
export function SkipUnifiedExceptionResponse(): ReturnType<typeof ApiExtension> {
  return ApiExtension(SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION, true)
}
