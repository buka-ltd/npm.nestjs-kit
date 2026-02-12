import { OmitType as SwaggerOmitType } from '@nestjs/swagger'
import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'


/**
 * 从模型中排除指定属性，生成新的类型。
 *
 * 类似 TypeScript 的 `Omit<T, K>`，同时保留 class-validator、class-transformer 和 Swagger 的元数据。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 * @param keys - 需要排除的属性名数组
 * @returns 排除了指定属性的新类
 *
 * @example
 * ```typescript
 * const UpdateUserDTO = OmitType(UserDTO, ['id', 'createdAt'])
 * ```
 */
export function OmitType<T, K extends keyof T>(classRef: Class<T>, keys: K[]): Class<Omit<T, typeof keys[number]>> {
  if (!ModelRegister.isModel(classRef)) {
    throw new TypeError('OmitType only accepts a class annotated with @Model().')
  }

  const OmitTypeClass = SwaggerOmitType(classRef, keys)

  for (const propertyKey of ModelRegister.getModelPropertyKeys(classRef)) {
    if (keys.includes(propertyKey as K)) continue

    ModelRegister.copyProperty(classRef, OmitTypeClass, propertyKey)

    const metadataKeys = Reflect.getMetadataKeys(classRef.prototype, propertyKey)

    for (const metadataKey of metadataKeys) {
      const metadata = Reflect.getMetadata(metadataKey, classRef.prototype, propertyKey)
      if (Reflect.hasMetadata(metadataKey, OmitTypeClass.prototype, propertyKey)) continue
      Reflect.defineMetadata(metadataKey, metadata, OmitTypeClass.prototype, propertyKey)
    }
  }

  return OmitTypeClass
}
