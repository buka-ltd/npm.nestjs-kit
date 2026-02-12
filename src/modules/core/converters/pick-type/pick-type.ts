import { PickType as SwaggerPickType } from '@nestjs/swagger'
import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'

/**
 * 从模型中选取指定属性，生成新的子集类型。
 *
 * 类似 TypeScript 的 `Pick<T, K>`，同时保留 class-validator、class-transformer 和 Swagger 的元数据。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 * @param keys - 需要选取的属性名数组
 * @returns 仅包含指定属性的新类
 *
 * @example
 * ```typescript
 * const CreateUserDTO = PickType(UserDTO, ['name', 'email'])
 * ```
 */
export function PickType<T, K extends keyof T>(classRef: Class<T>, keys: K[]): Class<Pick<T, typeof keys[number]>> {
  if (!ModelRegister.isModel(classRef)) {
    throw new TypeError('PickType only accepts a class annotated with @Model().')
  }

  const PickTypeClass = SwaggerPickType(classRef, keys)


  for (const key of keys) {
    ModelRegister.copyProperty(classRef, PickTypeClass, key as string)

    const metadataKeys = Reflect.getMetadataKeys(classRef.prototype, key as string)

    for (const metadataKey of metadataKeys) {
      const metadata = Reflect.getMetadata(metadataKey, classRef.prototype, key as string)
      if (Reflect.hasMetadata(metadataKey, PickTypeClass.prototype, key as string)) continue
      Reflect.defineMetadata(metadataKey, metadata, PickTypeClass.prototype, key as string)
    }
  }

  return PickTypeClass
}
