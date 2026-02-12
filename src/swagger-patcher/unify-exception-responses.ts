import { OpenAPIObject } from '@nestjs/swagger'
import { ErrorResponseSchema } from '../modules/exception/constants/error-response-schema.js'

export interface UnifyExceptionResponsesOptions {
  /** 覆写已有的哪些响应，支持 `'4xx'`、`'5xx'`、`'default'` 或具体数字状态码，默认 `[]` */
  overwrite?: ('4xx' | '5xx' | 'default' | number)[]
  /** 插入新的状态码响应（无论是否已存在），默认 `[]` */
  insert?: (number | 'default')[]
}

/**
 * 将统一异常响应结构注入 OpenAPI 文档。
 *
 * 在 `components.schemas` 注册 `ExceptionResponse` schema，
 * 在 `components.responses` 注册可复用的 `ExceptionResponse` 响应对象，
 * 并根据选项覆写或插入 operation 的异常响应。
 *
 * @param openapi - OpenAPI 文档对象（会被原地修改）
 * @param options - 控制覆写和插入行为
 * @param options.overwrite - 覆写已有的哪些响应，支持 `'4xx'`、`'5xx'`、`'default'` 或具体数字状态码，默认 `[]`
 * @param options.insert - 插入新的状态码响应（无论是否已存在），默认 `[]`
 *
 * @example
 * ```typescript
 * const document = SwaggerModule.createDocument(app, config)
 *
 * // 仅注册组件，不修改 operations
 * SwaggerPatcher.unifyExceptionResponses(document)
 *
 * // 为所有 operation 插入 401, 403, 500
 * SwaggerPatcher.unifyExceptionResponses(document, {
 *   insert: [401, 403, 500],
 * })
 *
 * // 覆写已有的 4xx/5xx 响应
 * SwaggerPatcher.unifyExceptionResponses(document, {
 *   overwrite: ['4xx', '5xx'],
 * })
 *
 * // 覆写 5xx + 插入 401, 403
 * SwaggerPatcher.unifyExceptionResponses(document, {
 *   overwrite: ['5xx'],
 *   insert: [401, 403],
 * })
 * ```
 */
export function unifyExceptionResponses(openapi: OpenAPIObject, options?: UnifyExceptionResponsesOptions): void {
  if (!openapi.components) openapi.components = {}
  if (!openapi.components.schemas) openapi.components.schemas = {}
  openapi.components.schemas['ExceptionResponse'] = ErrorResponseSchema

  if (!openapi.components.responses) openapi.components.responses = {}
  openapi.components.responses['ExceptionResponse'] = {
    description: 'Exception Response',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ExceptionResponse' },
      },
    },
  }

  const { overwrite = [], insert = [] } = options ?? {}
  const exceptionResponseRef = { $ref: '#/components/responses/ExceptionResponse' }

  for (const pathItem of Object.values(openapi.paths)) {
    for (const method of ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const) {
      const operation = pathItem[method]
      if (!operation?.responses) continue

      for (const code of Object.keys(operation.responses)) {
        const shouldOverwrite = overwrite.some((pattern) => {
          if (pattern === 'default') return code === 'default'
          if (pattern === '4xx') return code.startsWith('4')
          if (pattern === '5xx') return code.startsWith('5')
          return code === String(pattern)
        })
        if (shouldOverwrite) {
          operation.responses[code] = exceptionResponseRef
        }
      }

      for (const code of insert) {
        operation.responses[String(code)] = exceptionResponseRef
      }
    }
  }
}
