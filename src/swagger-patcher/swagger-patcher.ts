import { deepObjectifyQueries } from './deep-objectify-queries.js'
import { unifyExceptionResponses } from './unify-exception-responses.js'

export type { SchemaObject } from './openapi-helpers.js'

/**
 * Swagger/OpenAPI 文档修补工具，用于修正生成的 OpenAPI 文档中的已知问题。
 */
export class SwaggerPatcher {
  static deepObjectifyQueries = deepObjectifyQueries
  static unifyExceptionResponses = unifyExceptionResponses
}
