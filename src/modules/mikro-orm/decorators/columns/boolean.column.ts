import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsBoolean } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface BooleanOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * BOOLEAN 列装饰器，声明一个布尔类型列。
 *
 * 自动应用 MikroORM `@Property({ type: 'boolean' })`、`@IsBoolean()` 验证及 Swagger schema。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Boolean({ comment: '是否激活' })
 *   isActive: boolean
 * }
 * ```
 */
export function Boolean<T extends object>(options?: BooleanOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'boolean' })(target, propertyKey)

    applyDecorators(
      IsBoolean(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'boolean',
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
