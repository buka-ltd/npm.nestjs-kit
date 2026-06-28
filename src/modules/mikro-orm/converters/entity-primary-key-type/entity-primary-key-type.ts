
import { inheritTransformationMetadata, inheritValidationMetadata } from '@nestjs/mapped-types'
import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'
import * as SwaggerUtils from '~/utils/nestjs-swagger-utils'
import * as MikroOrmUtils from '../../utils/mikro-orm-utils.js'
import { IEntityPrimaryKey } from './types/index.js'


export const PrimaryKeyTypeClassMetadataPropertyKey = Symbol('PrimaryKeyTypeClassMetadataPropertyKey')

const storage = new WeakMap<Class<object>, Class<IEntityPrimaryKey<any>>>()

export function PrimaryKeyType<T extends object>(classRef: Class<T>): Class<IEntityPrimaryKey<T>> {
  if (storage.has(classRef)) {
    return storage.get(classRef)!
  }

  const properties = MikroOrmUtils.getMetadata(classRef)

  const primaryProperties: string[] = properties.filter((prop) => prop.primary)
    .map((prop) => prop.name)

  if (!primaryProperties.length) {
    throw new Error(`Cannot create PrimaryKeyType for ${classRef.name} because it has no primary properties.`)
  }

  class PrimaryKeyTypeClass {}

  // 设置唯一类名，使 @nestjs/swagger 为每个实体生成独立的 schema
  // 例如：UserPrimaryKeyType, ProductPrimaryKeyType
  // 避免不同实体的 PrimaryKeyType schema 相互覆盖
  Object.defineProperty(PrimaryKeyTypeClass, 'name', {
    value: `${classRef.name}PrimaryKeyType`,
  })

  PrimaryKeyTypeClass[PrimaryKeyTypeClassMetadataPropertyKey] = classRef

  SwaggerUtils.cloneMetadata(PrimaryKeyTypeClass, classRef, primaryProperties)
  inheritValidationMetadata(classRef, PrimaryKeyTypeClass, (key) => primaryProperties.includes(key))
  inheritTransformationMetadata(classRef, PrimaryKeyTypeClass, (key) => primaryProperties.includes(key))

  // 将主键字段的 ModelRegister 属性元数据复制到 PrimaryKeyTypeClass，
  for (const propertyName of primaryProperties) {
    ModelRegister.copyProperty(classRef, PrimaryKeyTypeClass as any, propertyName)
  }

  storage.set(classRef, PrimaryKeyTypeClass as Class<IEntityPrimaryKey<T>>)
  return PrimaryKeyTypeClass as Class<IEntityPrimaryKey<T>>
}
