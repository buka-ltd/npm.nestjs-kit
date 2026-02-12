import { OpenAPIObject } from '@nestjs/swagger'
import { isReferenceObject, deepDereference, forEachParameter, SchemaObject } from './openapi-helpers.js'

/**
 * 将 OpenAPI 文档中 query 参数中的对象和数组类型自动设置为 `style: 'deepObject'`。
 *
 * NestJS Swagger 生成的文档默认不会为复杂 query 参数设置 `style`，
 * 导致部分客户端生成器无法正确序列化嵌套查询参数。
 *
 * @param openapi - OpenAPI 文档对象（会被原地修改）
 *
 * @example
 * ```typescript
 * const document = SwaggerModule.createDocument(app, config)
 * SwaggerPatcher.deepObjectifyQueries(document)
 * SwaggerModule.setup('api', app, document)
 * ```
 */
export function deepObjectifyQueries(openapi: OpenAPIObject): void {
  forEachParameter(openapi, (parameter) => {
    if (parameter.in === 'query' && parameter.schema && parameter.style === undefined && (parameter.explode === undefined || parameter.explode === true)) {
      const schema = isReferenceObject(parameter.schema)
        ? deepDereference<SchemaObject>(openapi, parameter.schema)
        : parameter.schema

      if (schema && (schema.type === 'object' || schema.type === 'array')) {
        parameter.style = 'deepObject'
      }
    }
  })
}
