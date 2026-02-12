import * as R from 'ramda'
import { getSchemaPath } from '@nestjs/swagger'
import { Class } from 'type-fest'
import * as NestjsSwaggerUtils from '~/utils/nestjs-swagger-utils'


function scalarType(type: Class<any> | string | typeof String | typeof Number | typeof Boolean): any {
  if (typeof type === 'string') return { type: type as any }
  if (type === String) return { type: 'string' }
  if (type === Number) return { type: 'number' }
  if (type === Boolean) return { type: 'boolean' }

  return {
    $ref: getSchemaPath(type),
  }
}

export function swaggerMetadataToJsonSchema(metadata: NestjsSwaggerUtils.SchemaObjectMetadata): any {
  if ('enumName' in metadata && metadata.enumName) {
    return { $ref: getSchemaPath(metadata.enumName) }
  }

  const base = R.omit(['type', 'required', 'isArray', 'name'], metadata)

  let itemSchema: any
  if (NestjsSwaggerUtils.isLazyTypeFunc(metadata.type)) {
    itemSchema = { ...base, ...scalarType(metadata.type()) }
  } else {
    itemSchema = { ...base, ...scalarType(metadata.type as any) }
  }

  if (metadata.isArray) {
    return { type: 'array', items: itemSchema }
  }

  return itemSchema
}
