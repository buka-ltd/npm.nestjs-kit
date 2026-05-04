import type { EntityName } from '@mikro-orm/core'
import { EntitySchema } from '@mikro-orm/core'
import { Type } from '@nestjs/common'
import { PrimaryKeyType } from '../../converters/entity-primary-key-type/entity-primary-key-type'


/**
 * 将 `EntityName<T>` 解析为类引用（`Type`）。
 *
 * v7 中 `EntityName<T>` 只可能是 class、abstract class 或 `EntitySchema`（不再包含字符串）。
 */
export function resolveEntityClass<T>(entityName: EntityName<T>): Type | undefined {
  if (entityName instanceof EntitySchema) {
    return entityName.meta?.class as Type | undefined
  }

  // EntityClass | EntityCtor — 都是类引用，直接返回
  return entityName as Type
}

/**
 * 为关系装饰器的 entity 参数解析 Swagger / Property 所需的类型。
 *
 * - `eager` 为 true 时，返回实体类本身（完整对象结构）。
 * - 否则返回 `PrimaryKeyType(cls)`（仅包含主键字段）。
 * - 无法解析时回退为 `Object`。
 */
export function resolveEntityType<T>(
  entityRef: (() => EntityName<T> | EntityName<T>[]) | undefined,
  eager?: boolean,
): Type {
  if (!entityRef) return Object

  const result = entityRef()
  const entityName = Array.isArray(result) ? result[0] : result
  if (!entityName) return Object

  const cls = resolveEntityClass(entityName)
  if (!cls) return Object
  return eager ? cls : PrimaryKeyType(cls as any)
}
