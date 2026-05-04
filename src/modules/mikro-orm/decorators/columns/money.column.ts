import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsCurrency } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface MoneyOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * MONEY 列装饰器，声明一个货币类型列。
 *
 * 自动应用 MikroORM `@Property({ type: 'money' })`、`@IsCurrency()` 验证及 Swagger schema（format: money）。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class Order {
 *   @Money({ comment: '订单金额' })
 *   totalAmount: string
 * }
 * ```
 */
export function Money<T extends object>(options?: MoneyOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'money' })(target, propertyKey)

    applyDecorators(
      IsCurrency({ symbol: '' }),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          format: 'money',
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
