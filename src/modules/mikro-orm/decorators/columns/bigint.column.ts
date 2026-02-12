import { BigIntType, Property as MikroOrmProperty, PropertyOptions } from '@mikro-orm/core'
import { IsInt, IsString } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface BigintOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  mode?: 'string' | 'number'
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * BIGINT 列装饰器，声明一个 64 位整数列。
 *
 * 默认以字符串模式（`mode: 'string'`）映射以避免 JavaScript 精度丢失，
 * 可设置 `mode: 'number'` 以数值模式映射。
 *
 * @param options - 列配置，支持 `mode` 切换映射模式
 *
 * @example
 * ```typescript
 * @Entity()
 * class Order {
 *   @Bigint({ comment: '订单号' })
 *   orderNo: string
 *
 *   @Bigint({ mode: 'number' })
 *   amount: number
 * }
 * ```
 */
export function Bigint<T extends object>(options?: BigintOptions<T>): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    const mode = options?.mode ?? 'string'

    MikroOrmProperty({
      ...options,
      type: mode === 'string' ? new BigIntType('string') : new BigIntType('number'),
    })(target, propertyKey)

    const isStringMode = mode === 'string'

    applyDecorators(
      ...(isStringMode ? [IsString()] : [IsInt()]),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: isStringMode
          ? {
            type: 'string',
            description: options?.comment,
            example: options?.example,
            examples: options?.examples,
            required: !options?.nullable,
          }
          : {
            type: 'integer',
            format: 'int64',
            description: options?.comment,
            example: options?.example,
            examples: options?.examples,
            required: !options?.nullable,
          },
      }),
    )(target, propertyKey)
  }
}
