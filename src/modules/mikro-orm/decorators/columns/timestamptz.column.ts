import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsISO8601 } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface TimestamptzOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * TIMESTAMPTZ 列装饰器，声明一个带时区的时间戳列。
 *
 * 自动应用 MikroORM `@Property({ type: 'timestamptz' })`、`@IsISO8601()` 验证及 Swagger schema（format: date-time）。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Timestamptz({ comment: '创建时间' })
 *   createdAt: string
 * }
 * ```
 */
export function Timestamptz<T extends object>(options?: TimestamptzOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'timestamptz' })(target, propertyKey)

    applyDecorators(
      IsISO8601(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          format: 'date-time',
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
