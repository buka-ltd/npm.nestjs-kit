import { EntityName, ManyToOne as OrmManyToOne, ManyToOneOptions } from '@mikro-orm/core'
import { ApiHideProperty } from '@nestjs/swagger'
import { Type } from '@nestjs/common'
import { resolveEntityType } from './_resolve-entity-class'
import { Composite } from '~/modules/core'


/**
 * 多对一关系装饰器，封装 MikroORM `@ManyToOne()` 并自动注册 `@Composite()` 元数据和 Swagger schema。
 *
 * @example
 * ```typescript
 * @Entity()
 * class Post {
 *   @ManyToOne(() => User)
 *   author: User
 * }
 * ```
 */
export function ManyToOne<T extends object, O>(
  entity?: ManyToOneOptions<T, O> | string | ((e?: any) => EntityName<T>),
  options?: Partial<ManyToOneOptions<T, O>>,
): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    OrmManyToOne(entity, options)(target, propertyKey)

    const resolvedOptions = typeof entity === 'object' ? entity : options
    const entityRef: string | (() => EntityName<T>) | undefined
      = typeof entity === 'function'
        ? entity as () => EntityName<T>
        : typeof entity === 'string'
          ? entity
          : resolvedOptions?.entity as string | (() => EntityName<T>) | undefined

    if (resolvedOptions?.hidden) {
      ApiHideProperty()(target, propertyKey)
      return
    }

    const type = (): Type => resolveEntityType(entityRef, resolvedOptions?.eager)

    Composite({
      type,
      association: {
        kind: 'm:1',
        type,
      },
      schema: {
        description: resolvedOptions?.comment,
        required: !resolvedOptions?.nullable,
      },
    })(target, propertyKey)
  }
}
