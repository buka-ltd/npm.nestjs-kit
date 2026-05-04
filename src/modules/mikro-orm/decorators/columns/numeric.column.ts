import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsNumber } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface NumericOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * NUMERIC 列装饰器，声明一个精确数值列，适用于需要精确小数的场景（如金额计算）。
 *
 * 自动应用 MikroORM `@Property({ type: 'numeric' })`、`@IsNumber()` 验证及 Swagger schema。
 * 可通过 `precision` 和 `scale` 控制精度。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class Product {
 *   @Numeric({ precision: 10, scale: 2, comment: '价格' })
 *   price: number
 * }
 * ```
 */
export function Numeric<T extends object>(options?: NumericOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'numeric' })(target, propertyKey)

    applyDecorators(
      options?.scale ? IsNumber({ maxDecimalPlaces: options.scale }) : IsNumber(),
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
