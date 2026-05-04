import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsInt } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface TinyintOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * TINYINT 列装饰器，声明一个 8 位整数列。
 *
 * 自动应用 MikroORM `@Property({ type: 'tinyint' })`、`@IsInt()` 验证及 Swagger schema。
 *
 * @param options - 列配置，支持 `unsigned` 设置无符号
 *
 * @example
 * ```typescript
 * @Entity()
 * class Config {
 *   @Tinyint({ unsigned: true, comment: '状态码' })
 *   status: number
 * }
 * ```
 */
export function Tinyint<T extends object>(options?: TinyintOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'tinyint' })(target, propertyKey)

    applyDecorators(
      IsInt(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'integer',
          minimum: options?.unsigned ? 0 : -128,
          maximum: options?.unsigned ? 255 : 127,
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
