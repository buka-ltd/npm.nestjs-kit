import { Property as MikroOrmProperty, PropertyOptions } from '@mikro-orm/core'
import { IsString, MaxLength, MinLength } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface CharOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  length?: number
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * CHAR 列装饰器，声明一个固定长度字符串列。
 *
 * 自动应用 MikroORM `@Property({ type: 'char' })`、`@IsString()` 验证及 Swagger schema。
 * 当指定 `length` 时，同时校验最小和最大长度。
 *
 * @param options - 列配置，支持 `length` 指定固定长度
 *
 * @example
 * ```typescript
 * @Entity()
 * class Country {
 *   @Char({ length: 2, comment: '国家代码' })
 *   code: string
 * }
 * ```
 */
export function Char<T extends object>(options?: CharOptions<T>): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    MikroOrmProperty({ ...options, type: 'char' })(target, propertyKey)

    applyDecorators(
      ...(options?.length ? [IsString(), MaxLength(options.length), MinLength(options.length)] : [IsString()]),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          maxLength: options?.length,
          minLength: options?.length,
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
