import type { EntityName } from '@mikro-orm/core'
import { ManyToOne as OrmManyToOne } from '@mikro-orm/decorators/legacy'
import type { ManyToOneOptions } from '@mikro-orm/core'
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
export function ManyToOne<Target extends object, Owner extends object>(
  entity?: ManyToOneOptions<Owner, Target> | ((e?: any) => EntityName<Target>),
  options?: Partial<ManyToOneOptions<Owner, Target>>,
): (target: Owner, propertyName: string) => void {
  return (target, propertyKey) => {
    if (typeof entity === 'function') {
      OrmManyToOne(entity, options)(target, propertyKey)
    } else if (entity) {
      OrmManyToOne(entity)(target, propertyKey)
    } else {
      OrmManyToOne(options)(target, propertyKey)
    }

    const resolvedOptions = typeof entity === 'object' ? entity : options
    const entityRef = typeof entity === 'function' ? entity : resolvedOptions?.entity

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
