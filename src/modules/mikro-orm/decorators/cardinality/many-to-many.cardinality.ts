import { EntityName, ManyToMany as OrmManyToMany, ManyToManyOptions } from '@mikro-orm/core'
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
export function ManyToMany<T extends object, O>(
  entity?: ManyToManyOptions<T, O> | string | (() => EntityName<T>),
  mappedBy?: (string & keyof T) | ((e: T) => any),
  options?: Partial<ManyToManyOptions<T, O>>,
): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    OrmManyToMany(entity, mappedBy, options)(target, propertyKey)

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

    List({
      type,
      optional: resolvedOptions?.nullable,
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
