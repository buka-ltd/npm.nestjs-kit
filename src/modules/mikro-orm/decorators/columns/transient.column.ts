import { Property as MikroOrmProperty } from '@mikro-orm/core'


/**
 * 瞬态属性装饰器，标记属性不持久化到数据库。
 *
 * 等效于 MikroORM `@Property({ persist: false })`，适用于仅在运行时使用的计算属性。
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Transient()
 *   fullName: string
 * }
 * ```
 */
export function Transient(): PropertyDecorator {
  return MikroOrmProperty({ persist: false }) as PropertyDecorator
}
