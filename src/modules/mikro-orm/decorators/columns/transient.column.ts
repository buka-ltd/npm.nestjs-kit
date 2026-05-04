import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'


interface TransientOptions {
  type: string
}

/**
 * 瞬态属性装饰器，标记属性不持久化到数据库。
 *
 * 等效于 MikroORM `@Property({ persist: false })`，适用于仅在运行时使用的计算属性。
 *
 * @param options - 必须通过 `type` 指定属性类型（MikroORM v7 要求）
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Transient({ type: 'string' })
 *   fullName: string
 * }
 * ```
 */
export function Transient<T extends object>(options: TransientOptions): (target: T, propertyName: string) => void {
  return MikroOrmProperty({ persist: false, type: options.type })
}
