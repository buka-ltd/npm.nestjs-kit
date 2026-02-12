import { OpenAPIObject } from '@nestjs/swagger'
import { ValueOf } from 'type-fest'

type ReferenceObject = { $ref: string }
type ParameterObject = Exclude<ValueOf<Required<Required<OpenAPIObject>['components']>['parameters']>, ReferenceObject>
export type SchemaObject = Exclude<ValueOf<Required<Required<OpenAPIObject>['components']>['schemas']>, ReferenceObject>

export function isReferenceObject(obj: any): obj is ReferenceObject {
  return !!obj && typeof obj === 'object' && typeof obj.$ref === 'string'
}

export function deepDereference<T>(openapi: OpenAPIObject, reference: ReferenceObject): T | undefined {
  let current = reference

  const stack: string[] = []

  while (isReferenceObject(current)) {
    const refPath = current.$ref

    if (stack.includes(refPath)) return undefined
    stack.push(refPath)

    const parts = refPath.replace(/^#\//, '').split('/')
    let next: any = openapi
    for (const part of parts) {
      next = next[part]
    }
    if (!next) return undefined

    current = next
  }

  return current as T
}

export function forEachParameter(openapi: OpenAPIObject, callback: (parameter: ParameterObject) => void): void {
  for (const pathItem of Object.values(openapi.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (operation && operation.parameters) {
        for (const parameter of operation.parameters) {
          if (!('$ref' in parameter)) {
            callback(parameter)
          }
        }
      }
    }
  }

  for (const parameter of Object.values(openapi.components?.parameters || {})) {
    if (!('$ref' in parameter)) {
      callback(parameter)
    }
  }
}
