
import { ApiPropertyOptions } from '@nestjs/swagger'
import { Class } from 'type-fest'
import * as NestjsSwaggerUtils from '~/utils/nestjs-swagger-utils'
import { getPropertyOperators, getCollectionOperators, swaggerMetadataToJsonSchema } from './utils'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'
import { ModelRegister } from '../../decorators'


function getObjectSchema(classRef: Class<any>): SchemaObject {
  const properties = {}
  const requiredKeys: string[] = []
  const schema: SchemaObject = {
    type: 'object',
    properties,
    additionalProperties: false,
  }

  for (const propertyKey of ModelRegister.getModelPropertyKeys(classRef)) {
    if (typeof propertyKey !== 'string') continue

    const propertyMetadata = ModelRegister.getProperty(classRef, propertyKey)
    const isCollection = propertyMetadata?.association?.kind === '1:m' || propertyMetadata?.association?.kind === 'm:n'
    const isRelation = !!propertyMetadata?.association
    const isOptional = !!propertyMetadata?.optional

    if (!isOptional) requiredKeys.push(propertyKey)

    if (isRelation) {
      if (isCollection) {
        // some, none, every
        const sub = getObjectSchema(propertyMetadata.association!.type() as Class<any>)
        const operators = getCollectionOperators(classRef, propertyKey)

        for (const operator of operators) {
          properties[operator] = sub
        }
      } else {
        const sub = getObjectSchema(propertyMetadata.association!.type() as Class<any>)
        properties[propertyKey] = sub
      }
    } else {
      // eq, ne, lt, gt, lte, gte
      // const propertyClass = propertyMetadata?.type as Class<any>
      const propertySchema: ApiPropertyOptions = {
        type: 'object',
        properties: {},
        additionalProperties: false,
      }

      const originalSchema = NestjsSwaggerUtils.getMetadata(classRef, propertyKey)

      const operators = getPropertyOperators(classRef, propertyKey)

      for (const operator of operators) {
        if (['in', 'nin'].includes(operator)) {
          propertySchema.properties![operator] = {
            type: 'array',
            items: originalSchema
              ? swaggerMetadataToJsonSchema(originalSchema)
              : { type: 'string' },
          }
        } else {
          propertySchema.properties![operator] = originalSchema
            ? swaggerMetadataToJsonSchema(originalSchema)
            : { type: 'string' }
        }
      }

      properties[propertyKey] = propertySchema
    }
  }

  if (requiredKeys.length > 0) {
    schema.required = requiredKeys
  }

  return schema
}

export function getFilterQuerySchema(classRef: Class<any>): ApiPropertyOptions {
  return {
    ...getObjectSchema(classRef),
    description: `Filter query for ${classRef.name}`,
  } as ApiPropertyOptions
}
