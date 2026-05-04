import type { EntityName } from '@mikro-orm/core'
import { OneToOne as OrmOneToOne } from '@mikro-orm/decorators/legacy'
import type { OneToOneOptions } from '@mikro-orm/core'
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
export function OneToOne<Target extends object, Owner extends object>(
  entity?: OneToOneOptions<Owner, Target> | ((e: Owner) => EntityName<Target>),
  mappedByOrOptions?: (string & keyof Target) | ((e: Target) => any) | Partial<OneToOneOptions<Owner, Target>>,
  options?: Partial<OneToOneOptions<Owner, Target>>,
): (target: Owner, propertyName: string) => void {
  return (target, propertyKey) => {
    if (typeof entity === 'function') {
      OrmOneToOne(entity, mappedByOrOptions, options)(target, propertyKey)
    } else {
      OrmOneToOne(entity)(target, propertyKey)
    }

    const resolvedOptions = typeof entity === 'object'
      ? entity
      : (typeof mappedByOrOptions === 'object' && !(typeof mappedByOrOptions === 'function') ? mappedByOrOptions : options)
    const entityRef: (() => EntityName<Target> | EntityName<Target>[]) | undefined =
      typeof entity === 'function' ? entity as () => EntityName<Target> : resolvedOptions?.entity

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
