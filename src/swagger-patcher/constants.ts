/**
 * 标记 operation 跳过统一异常响应的 OpenAPI 扩展键
 *
 * 由 `@SkipUnifiedExceptionResponse()` 写入，`SwaggerPatcher.unifyExceptionResponses`
 * 读取后完全跳过该 operation（既不覆写也不插入）。
 */
export const SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION = 'x-buka-skip-unified-exception-response'
