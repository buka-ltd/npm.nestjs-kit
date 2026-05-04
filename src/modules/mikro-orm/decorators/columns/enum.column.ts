import type { AnyEntity } from '@mikro-orm/core'
import { Enum as MikroOrmEnum } from '@mikro-orm/decorators/legacy'
import type { EnumOptions } from '@mikro-orm/core'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface ColumnEnumOptions extends Omit<EnumOptions<AnyEntity>, 'type' | 'columnType'> {
  enumName?: string
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * 枚举列装饰器，声明一个枚举类型的数据库列。
 *
 * 自动应用 MikroORM `@Enum()` 及 Swagger schema，支持通过 `items` 指定枚举值。
 *
 * @param options - 列配置，必须通过 `items` 指定枚举值数组或返回枚举值的函数
 *
 * @example
 * ```typescript
 * enum Status { Active = 'active', Inactive = 'inactive' }
 *
 * @Entity()
 * class User {
 *   @Enum({ items: () => Object.values(Status), enumName: 'Status', comment: '用户状态' })
 *   status: Status
 * }
 * ```
 */
export function Enum<T extends object>(options: ColumnEnumOptions): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmEnum(options)(target, propertyKey)

    const items = options.items as ((() => (string | number)[]) | (string | number)[] | undefined)
    const values = typeof items === 'function' ? items() : items

    applyDecorators(
      Property({
        optional: options.nullable,
        lazy: options.lazy,
        schema: {
          description: options.comment,
          enum: values,
          enumName: options.enumName,
          example: options.example,
          examples: options.examples,
          required: !options.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
