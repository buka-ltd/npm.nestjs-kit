import { Embedded as MikroOrmEmbedded, EmbeddedOptions, EntityName } from '@mikro-orm/core'
import { Composite, List } from '~/modules/core/decorators'
import { Type } from '@nestjs/common'


/**
 * Embedded 列装饰器，声明一个嵌入式（Embeddable）对象列。
 *
 * 将嵌入对象的属性平铺到父实体的表中。支持单个嵌入对象和嵌入数组（`array: true`）。
 *
 * @param type - 嵌入类型的引用函数，或包含配置的 options 对象
 * @param options - 可选的 MikroORM Embedded 配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Embedded(() => Address)
 *   address: Address
 *
 *   @Embedded(() => Phone, { array: true })
 *   phones: Phone[]
 * }
 * ```
 */
export function Embedded<Owner extends object, Target>(
  type?: EmbeddedOptions<Owner, Target> | (() => EntityName<Target> | EntityName<Target>[]),
  options?: EmbeddedOptions<Owner, Target>,
): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    MikroOrmEmbedded(type, options)(target, propertyKey)

    const resolvedOptions = typeof type === 'object' ? type : options
    const resolvedType = typeof type === 'function' ? type : undefined

    if (resolvedType) {
      if (resolvedOptions?.array) {
        List({
          type: () => resolvedType() as Type,
          optional: resolvedOptions?.nullable,
          lazy: resolvedOptions?.lazy,
        })(target, propertyKey)
      } else {
        Composite({
          type: () => resolvedType() as Type,
          optional: resolvedOptions?.nullable,
          lazy: resolvedOptions?.lazy,
        })(target, propertyKey)
      }
    }
  }
}
