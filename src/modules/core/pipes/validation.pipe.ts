/* eslint-disable @typescript-eslint/no-unsafe-return */
import { MikroORM, EntityManager } from '@mikro-orm/core'
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common'
import { ArgumentMetadata, Injectable, Logger, PipeTransform, Type } from '@nestjs/common'
import { Class } from 'type-fest'
import { PrimaryKeyTypeClassMetadataPropertyKey } from '~/modules/mikro-orm'
import * as MikroOrmUtils from '~/modules/mikro-orm/utils/mikro-orm-utils'
import { isScalarClass, ModelRegister } from '../decorators'


function deepMap(obj: any, fn: (value: any) => any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepMap(item, fn))
  } else {
    return fn(obj)
  }
}


function transformReference(em: EntityManager, value: any, metatype: Class<object>): any {
  if (typeof value !== 'object' || value === null) return value

  const entityProperties = MikroOrmUtils.getMetadata(metatype)
  const primaryProperties = entityProperties.filter((p) => p.primary)

  if (primaryProperties.length === 1) {
    const propertyKey = primaryProperties[0].name
    const ref = em.getReference(metatype, value[propertyKey], { wrapped: true })
    return ref
  } else if (primaryProperties.length > 1) {
    const propertyKeys = primaryProperties.map((p) => p.name)
    const ref = em.getReference(metatype, propertyKeys.map((key) => value[key]), { wrapped: true })
    return ref
  }

  return value
}


function deepTransform(em: EntityManager, value: any, metatype: Class<any>): any {
  // value = transformReferenceProperties(em, value, metatype)

  if (typeof value !== 'object' || value === null) {
    // transform 不需要做 validate，其他的格式也可能是合法的，交给 class-validator 处理
    return value
  }

  const propertyKeys = ModelRegister.getModelPropertyKeys(metatype)

  const result = { ...value }

  for (const propertyKey of propertyKeys) {
    const propertyMetadata = ModelRegister.getProperty(metatype, propertyKey)
    if (!propertyMetadata) continue
    if (!(propertyKey in value)) continue

    const propertyValue = value[propertyKey]

    if (propertyMetadata.kind === 'composite') {
      const ctor = propertyMetadata.type() as Type<any>

      if (PrimaryKeyTypeClassMetadataPropertyKey in ctor) {
        // 是 PrimaryKeyType，读取存储在标记上的原始实体类
        const originalEntity = ctor[PrimaryKeyTypeClassMetadataPropertyKey] as Type<any>
        result[propertyKey] = transformReference(em, propertyValue, originalEntity)
      } else {
        const v = deepTransform(em, propertyValue, ctor)
        result[propertyKey] = v
      }
    } else if (propertyMetadata.kind === 'list') {
      if (propertyMetadata.type && !isScalarClass(propertyMetadata.type)) {
        result[propertyKey] = deepMap(
          propertyValue,
          (item) => deepTransform(em, item, propertyMetadata.type!() as Type<any>),
        )
      }
    } else if (propertyMetadata.kind === 'dictionary') {
      if (propertyMetadata.type && !isScalarClass(propertyMetadata.type)) {
        if (propertyValue instanceof Map) {
          result[propertyKey] = new Map(
            Array.from((propertyValue as Map<string, any>).entries())
              .map(([k, v]) => [k, deepTransform(em, v, propertyMetadata.type!() as Type<any>)] as const),
          )
        } else {
          result[propertyKey] = Object.fromEntries(
            Object.entries(propertyValue)
              .map(([k, v]) => [k, deepTransform(em, v, propertyMetadata.type!() as Type<any>)]),
          )
        }
      }
    }
  }

  return result
}


/**
 * 增强的验证管道，在 NestJS `ValidationPipe` 基础上增加了 MikroORM 实体引用自动转换能力。
 *
 * 验证通过后，会自动将嵌套对象中包含主键的属性转换为 MikroORM 的 `Reference` 对象。
 *
 * @example
 * ```typescript
 * // 在 NestJS 模块中全局注册
 * app.useGlobalPipes(new BukaValidationPipe(orm, em, { transform: true }))
 * ```
 */
@Injectable()
export class BukaValidationPipe extends ValidationPipe implements PipeTransform {
  private readonly logger = new Logger(BukaValidationPipe.name)
  private readonly validationOptions?: ValidationPipeOptions

  constructor(
    private readonly orm: MikroORM,
    private readonly em: EntityManager,
    options?: ValidationPipeOptions,
  ) {
    super(options)
    this.validationOptions = options
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    value = await super.transform(value, metadata)

    // 自定义装饰器（type === 'custom'）的参数值由开发者代码在运行时注入，
    // 不是来自 HTTP 请求体的 JSON 数据，不需要 MikroORM 实体引用转换。
    // 遵循 NestJS ValidationPipe.toValidate() 对 custom 类型跳过验证的设计模式
    if (metadata.type === 'custom') return value

    if (this.validationOptions && !this.validationOptions.transform) return value

    if (!metadata.metatype || typeof metadata.metatype !== 'function') {
      return value
    }

    const metatype = metadata.metatype

    const result = await deepTransform(this.em, value, metatype)
    return result
  }
}
