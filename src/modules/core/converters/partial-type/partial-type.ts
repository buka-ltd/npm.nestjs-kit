import { PartialType as SwaggerPartialType } from '@nestjs/swagger'
import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'

/**
 * 将模型的所有属性变为可选，生成新的 Partial 类型。
 *
 * 类似 TypeScript 的 `Partial<T>`，同时保留 class-validator、class-transformer 和 Swagger 的元数据。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 * @returns 所有属性均为可选的新类
 *
 * @example
 * ```typescript
 * const PatchUserDTO = PartialType(UserDTO)
 * ```
 */
export function PartialType<T>(classRef: Class<T>): Class<Partial<T>> {
  const PartialTypeClass = SwaggerPartialType(classRef)

  for (const propertyKey of ModelRegister.getModelPropertyKeys(classRef)) {
    ModelRegister.copyProperty(classRef, PartialTypeClass, propertyKey)

    const propertyMetadata = ModelRegister.getProperty(PartialTypeClass, propertyKey)
    if (propertyMetadata) {
      ModelRegister.setProperty(PartialTypeClass, propertyKey, { ...propertyMetadata, optional: true })
    }

    const metadataKeys = Reflect.getMetadataKeys(classRef.prototype, propertyKey as string)

    for (const metadataKey of metadataKeys) {
      const metadata = Reflect.getMetadata(metadataKey, classRef.prototype, propertyKey as string)
      if (Reflect.hasMetadata(metadataKey, PartialTypeClass.prototype, propertyKey as string)) continue
      Reflect.defineMetadata(metadataKey, metadata, PartialTypeClass.prototype, propertyKey as string)
    }
  }

  return PartialTypeClass
}
