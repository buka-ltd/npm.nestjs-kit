import type { EntityName } from '@mikro-orm/core'
import { ManyToMany as OrmManyToMany } from '@mikro-orm/decorators/legacy'
import type { ManyToManyOptions } from '@mikro-orm/core'
import { ApiHideProperty, getSchemaPath } from '@nestjs/swagger'
import { Type } from '@nestjs/common'
import { resolveEntityType } from './_resolve-entity-class'
import { List } from '~/modules/core'


/**
 * 多对多关系装饰器，封装 MikroORM `@ManyToMany()` 并自动注册 `@List()` 元数据和 Swagger schema。
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @ManyToMany(() => Role, (role) => role.users)
 *   roles: Collection<Role>
 * }
 * ```
 */
export function ManyToMany<Target extends object, Owner extends object>(
  entity?: ManyToManyOptions<Owner, Target> | (() => EntityName<Target>),
  mappedBy?: (string & keyof Target) | ((e: Target) => any),
  options?: Partial<ManyToManyOptions<Owner, Target>>,
): (target: Owner, propertyName: string & keyof Owner) => void {
  return (target, propertyKey) => {
    if (typeof entity === 'function') {
      OrmManyToMany(entity, mappedBy, options)(target, propertyKey)
    } else {
      OrmManyToMany(entity)(target, propertyKey)
    }

    const resolvedOptions = typeof entity === 'object' ? entity : options
    const entityRef = typeof entity === 'function' ? entity : resolvedOptions?.entity

    if (resolvedOptions?.hidden) {
      ApiHideProperty()(target, propertyKey)
      return
    }

    const type = (): Type => resolveEntityType(entityRef, resolvedOptions?.eager)

    List({
      type,
      optional: resolvedOptions?.nullable,
      lazy: resolvedOptions?.eager !== true,
      association: {
        kind: 'm:n',
        type,
      },
      schema: {
        description: resolvedOptions?.comment,
        type: 'array',
        items: {
          $ref: getSchemaPath(type()),
        },
      },
    })(target, propertyKey)
  }
}
