// 内联自 @nestjs/swagger 内部模块
// 避免 deep import 触发 ERR_PACKAGE_PATH_NOT_EXPORTED

import { Type } from '@nestjs/common'
import { isFunction, isString } from './nestjs-common'

/**
 * 模拟 @nestjs/swagger 的 DECORATORS 常量。
 *
 * `@nestjs/swagger` 的类型声明（`index.d.ts`）未导出 `DECORATORS`，
 * 仅在运行时可用。为避免 `ts(2305)` 错误，直接内联其常量值。
 */
export const DECORATORS = {
  API_MODEL_PROPERTIES: 'swagger/apiModelProperties',
  API_MODEL_PROPERTIES_ARRAY: 'swagger/apiModelPropertiesArray',
} as const

// 来自 @nestjs/swagger/dist/plugin/plugin-constants
// @nestjs/swagger Plugin 在编译时注入的静态方法名
export const METADATA_FACTORY_NAME = '_OPENAPI_METADATA_FACTORY'


// 内联自 @nestjs/swagger/dist/interfaces/schema-object-metadata.interface
export type SchemaObjectMetadata = {
  type?: Type<unknown> | Function | [Function] | Record<string, any> | 'array' | 'string' | 'number' | 'boolean' | 'integer' | 'file' | 'null'
  required?: boolean
  isArray?: boolean
  name?: string
  pattern?: string | RegExp
  enum?: any[] | Record<string, any> | (() => any[] | Record<string, any>)
  enumName?: string
  enumSchema?: Record<string, any>
  properties?: Record<string, SchemaObjectMetadata>
  additionalProperties?: Record<string, any> | boolean
  selfRequired?: boolean
  [key: string]: any
}

// 内联自 @nestjs/swagger/dist/services/model-properties-accessor
export function getModelProperties(prototype: Type<unknown>): string[] {
  const properties: string[]
    = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, prototype) || []
  return properties
    .filter(isString)
    .filter((key) => key.charAt(0) === ':' && !isFunction(prototype[key]))
    .map((key) => key.slice(1))
}

// 内联自 @nestjs/swagger/dist/type-helpers/mapped-types.utils
export function clonePluginMetadataFactory(
  target: Type<unknown>,
  parent: Type<unknown>,
  transformFn: (metadata: Record<string, any>) => Record<string, any> = (x) => x,
): void {
  let targetMetadata: Record<string, any> = {}

  do {
    if (!parent.constructor) {
      return
    }
    if (!parent.constructor[METADATA_FACTORY_NAME]) {
      continue
    }
    const parentMetadata = parent.constructor[METADATA_FACTORY_NAME]()
    targetMetadata = { ...parentMetadata, ...targetMetadata }
  } while (
    (parent = Reflect.getPrototypeOf(parent) as Type<unknown>)
    && parent !== Object.prototype
    && parent
  )

  targetMetadata = transformFn(targetMetadata)

  if (target[METADATA_FACTORY_NAME]) {
    const originalFactory = target[METADATA_FACTORY_NAME] as () => Record<string, any>
    target[METADATA_FACTORY_NAME] = (): Record<string, any> => ({
      ...originalFactory(),
      ...targetMetadata,
    })
  } else {
    target[METADATA_FACTORY_NAME] = (): Record<string, any> => targetMetadata
  }
}

// 内联自 @nestjs/swagger/dist/utils/is-built-in-type.util
const BUILT_IN_TYPES = [String, Boolean, Number, Object, Array]

export function isBuiltInType(type: Type<unknown> | Function | string): boolean {
  return isFunction(type) && BUILT_IN_TYPES.some((item) => item === type)
}
