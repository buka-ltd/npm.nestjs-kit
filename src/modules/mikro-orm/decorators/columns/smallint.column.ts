import { Property as MikroOrmProperty, PropertyOptions } from '@mikro-orm/core'
import { IsInt } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface SmallintOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * SMALLINT 列装饰器，声明一个 16 位整数列。
 *
 * 自动应用 MikroORM `@Property({ type: 'smallint' })`、`@IsInt()` 验证及 Swagger schema。
 *
 * @param options - 列配置，支持 `unsigned` 设置无符号
 *
 * @example
 * ```typescript
 * @Entity()
 * class Config {
 *   @Smallint({ comment: '排序权重' })
 *   weight: number
 * }
 * ```
 */
export function Smallint<T extends object>(options?: SmallintOptions<T>): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    MikroOrmProperty({ ...options, type: 'smallint' })(target, propertyKey)

    applyDecorators(
      IsInt(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'integer',
          minimum: options?.unsigned ? 0 : -32768,
          maximum: options?.unsigned ? 65535 : 32767,
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
