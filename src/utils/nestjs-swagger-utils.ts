/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as R from 'ramda'
import { Type } from '@nestjs/common'
import { ApiProperty, DECORATORS } from '@nestjs/swagger'
import { isFunction } from './internals/nestjs-common'
import type { SchemaObjectMetadata } from './internals/nestjs-swagger'
import {
  METADATA_FACTORY_NAME,
  getModelProperties,
  clonePluginMetadataFactory,
  isBuiltInType,
} from './internals/nestjs-swagger'

export type { SchemaObjectMetadata }

/**
 * 克隆 @nestjs/swagger Plugin 添加的元数据
 */
// export const cloneSwaggerPluginMetadataFactory = clonePluginMetadataFactory

export function cloneMetadata(target: Function, source: Type<unknown>, keys: string[]): void {
  clonePluginMetadataFactory(
    target as Type<unknown>,
    source.prototype,
    (metadata: Record<string, any>) => R.pick(keys, metadata),
  )

  for (const propertyKey of keys) {
    const metadata = getMetadataOfDecorator(source, propertyKey)
    if (metadata) {
      ApiProperty(metadata as any)(target.prototype, propertyKey)
    }
  }
}

/**
 * 获取 @ApiProperty 添加的 Metadata
 */
export function getMetadataOfDecorator(classRef: Type<any>): Record<string, SchemaObjectMetadata>
export function getMetadataOfDecorator(classRef: Type<any>, propertyKey: string): SchemaObjectMetadata | undefined
export function getMetadataOfDecorator(classRef: Type<any>, propertyKey?: string): SchemaObjectMetadata | undefined | Record<string, SchemaObjectMetadata> {
  if (propertyKey) {
    return Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, classRef.prototype, propertyKey)
  }

  const props = getModelProperties(classRef.prototype)

  return R.fromPairs(
    props.map((prop) => [
      prop,
      Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, classRef.prototype, prop),
    ]),
  )
}

/**
 * 获取 @nestjs/swagger Plugin 添加的 Schema
 */

function getMetadataOfPlugin(classRef: Type<any>): Record<string, SchemaObjectMetadata>
function getMetadataOfPlugin(classRef: Type<any>, propertyKey: string): SchemaObjectMetadata | undefined
function getMetadataOfPlugin(classRef: Type<any>, propertyKey?: string): SchemaObjectMetadata | undefined | Record<string, SchemaObjectMetadata> {
  const propsInPlugin = typeof classRef[METADATA_FACTORY_NAME] === 'function' ? classRef[METADATA_FACTORY_NAME]() : {}

  if (propertyKey) return propsInPlugin[propertyKey]
  return propsInPlugin
}

/**
 * Get all metadata of @ApiProperty() defined on the class.
 *
 * 可以利用这个函数，遍历 Dto/Entity 上定义的所有属性，而不需要去实例化一个对象
 */
export function getMetadata(classRef: Type<any>): Record<string, SchemaObjectMetadata>
export function getMetadata(classRef: Type<any>, propertyKey: string): SchemaObjectMetadata | undefined
export function getMetadata(classRef: Type<any>, propertyKey?: string): SchemaObjectMetadata | Record<string, SchemaObjectMetadata> {
  const propsInDecorator = getMetadataOfDecorator(classRef)
  const propsInPlugin = getMetadataOfPlugin(classRef)

  const metadataMap = R.mergeRight(propsInPlugin, propsInDecorator)
  if (propertyKey) return metadataMap[propertyKey]
  return metadataMap
}

/**
 * Set @ApiProperty() to all properties of the class.
 */
export function overridePluginMetadata(classRef: Type<any>, props: Record<string, SchemaObjectMetadata>): void {
  classRef[METADATA_FACTORY_NAME] = () => props
}


export function getMetadataType(metadata: SchemaObjectMetadata): string | Function {
  if (isFunction(metadata.type) && metadata.type.name === 'type') {
    return getMetadataType((<any>metadata.type)())
  } else if (isFunction(metadata.type) && isBuiltInType(metadata.type)) {
    return metadata.type.name.toLowerCase()
  }

  return metadata.type as (string | Function)
}

/**
 * 判断 type 是否是 lazy type function
 */
export function isLazyTypeFunc(
  type: any,
): type is { type: Function } & Function {
  return isFunction(type) && type.name == 'type'
}
