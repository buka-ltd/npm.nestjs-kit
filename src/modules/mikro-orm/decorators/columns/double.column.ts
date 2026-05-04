import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsNumber } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface DoubleOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * DOUBLE 列装饰器，声明一个双精度浮点数列。
 *
 * 自动应用 MikroORM `@Property({ type: 'double' })`、`@IsNumber()` 验证及 Swagger schema。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class Location {
 *   @Double({ comment: '经度' })
 *   longitude: number
 * }
 * ```
 */
export function Double<T extends object>(options?: DoubleOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'double' })(target, propertyKey)

    applyDecorators(
      IsNumber(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'number',
          format: 'double',
          minimum: options?.unsigned ? 0 : undefined,
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
