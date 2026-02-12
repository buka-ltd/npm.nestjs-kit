import { EntityName, EntitySchema, MetadataStorage } from '@mikro-orm/core'
import { Type } from '@nestjs/common'
import { PrimaryKeyType } from '../../converters/entity-primary-key-type/entity-primary-key-type'


/**
 * 将 `EntityName<T>` 统一解析为类引用（`Type`）。
 *
 * `EntityName<T>` 可能是 class、`EntitySchema`、字符串实体名 或 `{ name: string }`。
 * 当无法解析时返回 `undefined`（例如未注册的字符串名称）。
 *
 * @example
 * resolveEntityClass(User)            // User（class → 直接返回）
 * resolveEntityClass(userSchema)      // User（EntitySchema → 从 meta.class 获取）
 * resolveEntityClass('User')          // User | undefined（字符串 → 遍历 MetadataStorage 按 className 查找）
 */
export function resolveEntityClass<T>(entityName: EntityName<T>): Type | undefined {
  if (typeof entityName === 'function') return entityName as Type

  if (entityName instanceof EntitySchema) {
    const meta = entityName.meta
    return meta?.class as Type | undefined
  }

  // string 或 { name: string } — 遍历 MetadataStorage 按 className 查找已注册的实体类
  const name = typeof entityName === 'string' ? entityName : entityName.name
  if (!name) return undefined

  const store = MetadataStorage.getMetadata()
  for (const meta of Object.values(store)) {
    if (meta?.className === name) return meta.class as Type | undefined
  }

  return undefined
}

/**
 * 为关系装饰器的 entity 参数解析 Swagger / Property 所需的类型。
 *
 * - `eager` 为 true 时，返回实体类本身（完整对象结构）。
 * - 否则返回 `PrimaryKeyType(cls)`（仅包含主键字段）。
 * - 无法解析时回退为 `Object`。
 *
 * @example
 * resolveEntityType(() => User, false)  // PrimaryKeyType(User)
 * resolveEntityType(() => User, true)   // User
 * resolveEntityType('User', false)      // PrimaryKeyType(User) | Object
 * resolveEntityType(undefined)          // Object
 */
export function resolveEntityType<T>(
  entityRef: string | (() => EntityName<T>) | undefined,
  eager?: boolean,
): Type {
  if (!entityRef) return Object

  if (typeof entityRef === 'string') {
    const cls = resolveEntityClass<T>(entityRef as EntityName<T>)
    if (!cls) return Object
    return eager ? cls : PrimaryKeyType(cls as any)
  }

  const entityName = entityRef()
  const cls = resolveEntityClass(entityName)
  if (!cls) return Object
  return eager ? cls : PrimaryKeyType(cls as any)
}
