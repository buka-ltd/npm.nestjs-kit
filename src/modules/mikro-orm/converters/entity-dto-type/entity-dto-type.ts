import { Collection } from '@mikro-orm/core'
import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'
import { ExcludeOpt } from '~/modules/mikro-orm'


/**
 * 从实体中排除 `Collection` 类型的属性键。
 *
 * `Collection` 对应 OneToMany / ManyToMany 关系，默认 `lazy: true`，
 * 不应出现在 EntityDto 中。
 */
type IsCollection<T> = T extends Collection<any> ? true : false

/**
 * 将实体的 MikroORM 类型转换为 DTO 友好的类型：
 * - `Collection<Entity>` → 键被排除（lazy，不在默认 Swagger 中）
 * - `Ref<Entity>` → **保留原样**（`Ref` 是 nestjs-kit 的一等公民类型，
 *   序列化层会自动处理：populated 时完整序列化，否则仅返回主键）
 * - `Xxx & Opt` → 去除 `Opt` 标记
 */
export type EntityDtoShape<T> = {
  [K in keyof T as IsCollection<T[K]> extends true ? never : K]:
    ExcludeOpt<T[K]>
}

/**
 * 基于实体生成一个无继承关系的纯 DTO 类，用于安全派生。
 *
 * 返回的类：
 * - 不继承实体类，避免 `Collection` 类型与 DTO 字段冲突
 * - 仅包含非 `lazy: true` 的 Model 属性
 * - 保留 `Ref<Entity>` 类型（序列化层自动处理：populated 时完整序列化，否则仅主键）
 * - 保留所有 Swagger、class-validator、class-transformer 元数据
 * - Swagger schema 与 `findOne()` 不加 populate 的结果一致
 *
 * @param classRef - 使用 `@Model()` 标注的实体类引用
 * @returns 可用于 `extends` 派生的纯 DTO 类
 *
 * @example
 * ```typescript
 * // 基本用法：派生不含 Collection 的 DTO
 * class UserProfileBriefDto extends EntityDto(UserProfile) {}
 *
 * // 扩展用法：手动添加 lazy 属性
 * class UserProfileDetailDto extends EntityDto(UserProfile) {
 *   @List({ type: () => PrimaryKeyType(Avatar) })
 *   avatars!: PrimaryKeyTypeClass[]
 * }
 * ```
 */
export function EntityDto<T extends object>(classRef: Class<T>): Class<EntityDtoShape<T>> {
  if (!ModelRegister.isModel(classRef)) {
    throw new TypeError('EntityDto only accepts a class annotated with @Model().')
  }

  class EntityDtoClass {}

  for (const propertyKey of ModelRegister.getModelPropertyKeys(classRef)) {
    const metadata = ModelRegister.getProperty(classRef, propertyKey)
    if (metadata?.lazy) continue

    ModelRegister.copyProperty(classRef, EntityDtoClass, propertyKey)

    const metadataKeys = Reflect.getMetadataKeys(classRef.prototype, propertyKey)

    for (const metadataKey of metadataKeys) {
      const value = Reflect.getMetadata(metadataKey, classRef.prototype, propertyKey)
      if (Reflect.hasMetadata(metadataKey, EntityDtoClass.prototype, propertyKey)) continue
      Reflect.defineMetadata(metadataKey, value, EntityDtoClass.prototype, propertyKey)
    }
  }

  return EntityDtoClass as unknown as Class<EntityDtoShape<T>>
}
