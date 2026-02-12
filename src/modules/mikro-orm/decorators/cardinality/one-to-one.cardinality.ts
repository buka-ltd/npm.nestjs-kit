import { EntityName, OneToOne as OrmOneToOne, OneToOneOptions } from '@mikro-orm/core'
import { ApiHideProperty } from '@nestjs/swagger'
import { Type } from '@nestjs/common'
import { resolveEntityType } from './_resolve-entity-class'
import { Composite } from '~/modules/core'


/**
 * 一对一关系装饰器，封装 MikroORM `@OneToOne()` 并自动注册 `@Composite()` 元数据和 Swagger schema。
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @OneToOne(() => Profile, (profile) => profile.user)
 *   profile: Profile
 * }
 * ```
 */
export function OneToOne<Target, Owner>(
  entity?: OneToOneOptions<Owner, Target> | string | ((e: Owner) => EntityName<Target>),
  mappedByOrOptions?: (string & keyof Target) | ((e: Target) => any) | Partial<OneToOneOptions<Owner, Target>>,
  options?: Partial<OneToOneOptions<Owner, Target>>,
): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    OrmOneToOne(entity, mappedByOrOptions, options)(target, propertyKey)

    const resolvedOptions = typeof entity === 'object'
      ? entity
      : (typeof mappedByOrOptions === 'object' && !(typeof mappedByOrOptions === 'function') ? mappedByOrOptions : options)
    const entityRef: string | (() => EntityName<Target>) | undefined
      = typeof entity === 'function'
        ? entity as () => EntityName<Target>
        : typeof entity === 'string'
          ? entity
          : (typeof entity === 'object'
            ? entity.entity as string | (() => EntityName<Target>) | undefined
            : undefined)

    if (resolvedOptions?.hidden) {
      ApiHideProperty()(target, propertyKey)
      return
    }

    const type = (): Type => resolveEntityType(entityRef, resolvedOptions?.eager)

    Composite({
      type,
      association: {
        kind: '1:1',
        type,
      },
      schema: {
        description: resolvedOptions?.comment,
        required: !resolvedOptions?.nullable,
      },
    })(target, propertyKey)
  }
}
