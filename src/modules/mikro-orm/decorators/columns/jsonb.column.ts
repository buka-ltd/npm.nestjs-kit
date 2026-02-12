import { Property as MikroOrmProperty, PropertyOptions } from '@mikro-orm/core'
import { ApiHideProperty, ApiPropertyOptions } from '@nestjs/swagger'
import { Composite, Dictionary, List } from '~/modules/core/decorators'
import { Class } from 'type-fest'


interface JsonbOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  type: () => Class<object>
  kind?: 'composite' | 'list' | 'dictionary'
  schema?: ApiPropertyOptions
}

/**
 * JSONB 列装饰器，声明一个 JSONB 类型的数据库列。
 *
 * 通过 `kind` 参数指定 JSON 数据的结构类型：`'composite'`（对象）、`'list'`（数组）或 `'dictionary'`（字典），
 * 自动应用对应的 `@Composite()`、`@List()` 或 `@Dictionary()` 装饰器。
 *
 * @param options - 列配置，必须通过 `type` 指定嵌套类引用
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Jsonb({ type: () => ProfileDTO, comment: '用户资料' })
 *   profile: ProfileDTO
 *
 *   @Jsonb({ type: () => TagDTO, kind: 'list', comment: '标签列表' })
 *   tags: TagDTO[]
 * }
 * ```
 */
export function Jsonb<T extends object>(options: JsonbOptions<T>): PropertyDecorator {
  const { type, kind = 'composite', schema, ...ormOptions } = options

  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    MikroOrmProperty({
      ...ormOptions,
      columnType: 'jsonb',
    })(target, propertyKey)

    if (ormOptions.hidden) {
      ApiHideProperty()(target, propertyKey)
      return
    }

    const mergedSchema: ApiPropertyOptions = {
      description: ormOptions.comment,
      ...schema,
    }

    const decoratorOptions = {
      type,
      optional: ormOptions.nullable,
      lazy: ormOptions.lazy,
      schema: mergedSchema,
    }

    switch (kind) {
    case 'list':
      List(decoratorOptions)(target, propertyKey)
      break
    case 'dictionary':
      Dictionary(decoratorOptions)(target, propertyKey)
      break
    default:
      Composite(decoratorOptions)(target, propertyKey)
      break
    }
  }
}
