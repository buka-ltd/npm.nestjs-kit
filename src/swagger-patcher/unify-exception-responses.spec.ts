import { describe, expect, it, jest } from '@jest/globals'
import type { OpenAPIObject } from '@nestjs/swagger'
import { SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION } from './constants'
import type { OperationObject } from './openapi-helpers'
import type { UnifyExceptionResponsesFilterContext } from './unify-exception-responses'
import { unifyExceptionResponses } from './unify-exception-responses'

/** 标记 operation 跳过统一异常响应（与 @SkipUnifiedExceptionResponse 写入的扩展一致） */
function markSkip(operation: OperationObject, value = true): OperationObject {
  (operation as OperationObject & Record<string, unknown>)[SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION] = value
  return operation
}

/** 构造带 200/400/500 响应的 operation */
function createOperation(): OperationObject {
  return {
    responses: {
      200: { description: 'ok' },
      400: { description: 'bad request' },
      500: { description: 'internal error' },
    },
  }
}

/** 构造最小可用的 OpenAPI 文档 */
function createDocument(paths: Record<string, OperationObject> = { '/demo': createOperation() }): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'test', version: '1.0.0' },
    paths: Object.fromEntries(
      Object.entries(paths).map(([pathname, operation]) => [pathname, { post: operation }]),
    ),
  }
}

/** 读取文档中的 operation（测试内已保证存在） */
function getOperation(document: OpenAPIObject, pathname = '/demo'): OperationObject {
  return document.paths[pathname].post!
}

/** 断言响应已指向统一的 ExceptionResponse */
function expectExceptionResponse(response: unknown): void {
  expect(response).toEqual({ $ref: '#/components/responses/ExceptionResponse' })
}

describe('unifyExceptionResponses', () => {
  it('不传选项时只注册组件，不修改 operation', () => {
    const document = createDocument()

    unifyExceptionResponses(document)

    expect(document.components?.schemas?.ExceptionResponse).toBeDefined()
    expect(document.components?.responses?.ExceptionResponse).toBeDefined()
    expect(getOperation(document).responses[400]).toEqual({ description: 'bad request' })
    expect(getOperation(document).responses[500]).toEqual({ description: 'internal error' })
  })

  it('overwrite 4xx/5xx 时保留其它响应', () => {
    const document = createDocument()

    unifyExceptionResponses(document, { overwrite: ['4xx', '5xx'] })

    expectExceptionResponse(getOperation(document).responses[400])
    expectExceptionResponse(getOperation(document).responses[500])
    expect(getOperation(document).responses[200]).toEqual({ description: 'ok' })
  })

  it('insert 插入缺失状态码；已存在状态码被覆盖（当前语义）', () => {
    const document = createDocument()

    unifyExceptionResponses(document, { insert: [400, 401] })

    expectExceptionResponse(getOperation(document).responses[400])
    expectExceptionResponse(getOperation(document).responses[401])
  })

  it('带跳过扩展的 operation 不覆写也不插入', () => {
    const operation = markSkip(createOperation())
    const document = createDocument({ '/demo': operation })

    unifyExceptionResponses(document, {
      overwrite: ['4xx', '5xx'],
      insert: [400, 401, 403, 500],
    })

    expect(operation.responses[400]).toEqual({ description: 'bad request' })
    expect(operation.responses[500]).toEqual({ description: 'internal error' })
    expect(operation.responses[401]).toBeUndefined()
    expect(operation.responses[403]).toBeUndefined()
  })

  it('跳过扩展为 false 时正常处理', () => {
    const operation = markSkip(createOperation(), false)
    const document = createDocument({ '/demo': operation })

    unifyExceptionResponses(document, { overwrite: ['4xx', '5xx'], insert: [401] })

    expectExceptionResponse(operation.responses[400])
    expectExceptionResponse(operation.responses[401])
  })

  it('filter 返回 false 时跳过，并传入正确的上下文', () => {
    const operation = createOperation()
    const document = createDocument({ '/demo': operation })
    const filter = jest.fn<(context: UnifyExceptionResponsesFilterContext) => boolean>(() => false)

    unifyExceptionResponses(document, { overwrite: ['4xx', '5xx'], insert: [401], filter })

    expect(filter).toHaveBeenCalledTimes(1)
    expect(filter).toHaveBeenCalledWith({ pathname: '/demo', method: 'post', operation })
    expect(operation.responses[400]).toEqual({ description: 'bad request' })
    expect(operation.responses[401]).toBeUndefined()
  })

  it('filter 返回 true 时正常处理', () => {
    const document = createDocument()

    unifyExceptionResponses(document, { overwrite: ['4xx', '5xx'], filter: () => true })

    expectExceptionResponse(getOperation(document).responses[400])
  })

  it('多 path 时只跳过命中的 operation', () => {
    const document = createDocument({
      '/skip': createOperation(),
      '/keep': createOperation(),
    })

    unifyExceptionResponses(document, {
      overwrite: ['4xx', '5xx'],
      filter: ({ pathname }) => pathname !== '/skip',
    })

    expect(getOperation(document, '/skip').responses[400]).toEqual({ description: 'bad request' })
    expectExceptionResponse(getOperation(document, '/keep').responses[400])
  })
})
