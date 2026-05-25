import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'


interface TransientOptions {
  type: string
}

/**
 * 瞬态属性装饰器，标记属性不持久化到数据库。
 *
 * 等效于 MikroORM `@Property({ persist: false })`，适用于仅在运行时使用的计算属性。
 * 同时向 ModelRegister 注册，以便类型系统正确识别该属性。
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
  return (target, propertyName) => {
    ModelRegister.addProperty(target.constructor as Class<any>, propertyName, {
      kind: 'scalar',
      optional: false,
      lazy: false,
    })
    return MikroOrmProperty({ persist: false, type: options.type })(target, propertyName)
  }
}
