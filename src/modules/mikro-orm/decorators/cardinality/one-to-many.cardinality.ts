import { EntityName, OneToMany as OrmOneToMany, OneToManyOptions } from '@mikro-orm/core'
import { ApiHideProperty, getSchemaPath } from '@nestjs/swagger'
import { Type } from '@nestjs/common'
import { resolveEntityType } from './_resolve-entity-class'
import { List } from '~/modules/core'


/**
 * 一对多关系装饰器，封装 MikroORM `@OneToMany()` 并自动注册 `@List()` 元数据和 Swagger schema。
 *
 * @param options - MikroORM OneToMany 配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @OneToMany({ entity: () => Post, mappedBy: 'author' })
 *   posts: Collection<Post>
 * }
 * ```
 */
export function OneToMany<Target, Owner>(options: OneToManyOptions<Owner, Target>): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    OrmOneToMany(options)(target, propertyKey)

    if (options.hidden) {
      ApiHideProperty()(target, propertyKey)
      return
    }

    const entityRef: string | (() => EntityName<Target>) | undefined = options.entity

    const type = (): Type => resolveEntityType(entityRef, options.eager)

    List({
      type,
      optional: options.nullable,
      association: {
        kind: '1:m',
        type,
      },
      schema: {
        description: options.comment,
        type: 'array',
        items: {
          $ref: getSchemaPath(type()),
        },
      },
    })(target, propertyKey)
  }
}
