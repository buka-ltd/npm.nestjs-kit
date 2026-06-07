import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { ApiHideProperty, ApiPropertyOptions } from '@nestjs/swagger'
import { Composite, Dictionary, List } from '~/modules/core/decorators'
import { isScalarClass, type ScalarClass } from '~/modules/core/decorators/class-validator/is-scalar'
import { Class } from 'type-fest'


interface JsonbOptionsBase<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  schema?: ApiPropertyOptions
}

/**
 * kind = 'composite'（默认）时，type 必须是 class 引用，不能是标量类型。
 */
interface JsonbOptionsComposite<T extends object> extends JsonbOptionsBase<T> {
  type: () => Class<object>
  kind?: 'composite'
}

/**
 * kind = 'list' | 'dictionary' 时，type 可以是 class 引用或标量类型（String / Number / Boolean）。
 */
interface JsonbOptionsListOrDict<T extends object> extends JsonbOptionsBase<T> {
  type: (() => Class<object>) | ScalarClass
  kind: 'list' | 'dictionary'
}

type JsonbOptions<T extends object> = JsonbOptionsComposite<T> | JsonbOptionsListOrDict<T>

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
export function Jsonb<T extends object>(options: JsonbOptions<T>): (target: T, propertyName: string) => void {
  const { type, kind = 'composite', schema, ...ormOptions } = options

  return (target, propertyKey) => {
    MikroOrmProperty({
      ...ormOptions,
      columnType: 'jsonb',
      type: 'json',
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
        if (isScalarClass(type)) {
          throw new TypeError(
            `Jsonb with kind='composite' requires a class reference (() => Class), but got scalar type: ${type.name}`,
          )
        }
        Composite({ ...decoratorOptions, type })(target, propertyKey)
        break
    }
  }
}
