import { OneToMany as OrmOneToMany } from '@mikro-orm/decorators/legacy'
import type { OneToManyOptions } from '@mikro-orm/core'
import { ApiHideProperty } from '@nestjs/swagger'
import { Type } from '@nestjs/common'
import { resolveEntitySchemaType, resolveEntityType } from './_resolve-entity-class'
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
export function OneToMany<Target extends object, Owner extends object>(options: OneToManyOptions<Owner, Target>): (target: Owner, propertyName: string) => void {
  return (target, propertyKey) => {
    OrmOneToMany(options)(target, propertyKey)

    if (options.hidden) {
      ApiHideProperty()(target, propertyKey)
      return
    }

    const entityRef = options.entity

    const type = (): Type => resolveEntityType(entityRef, options.eager)

    List({
      type,
      optional: options.nullable,
      lazy: options.eager !== true,
      association: {
        kind: '1:m',
        type,
      },
      schema: {
        description: options.comment,
        type: resolveEntitySchemaType(entityRef),
        isArray: true,
      },
    })(target, propertyKey)
  }
}
