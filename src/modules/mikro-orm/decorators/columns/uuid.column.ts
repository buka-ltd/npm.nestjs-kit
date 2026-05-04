import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsString } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface UuidOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * UUID 列装饰器，声明一个 UUID 类型列。
 *
 * 自动应用 MikroORM `@Property({ type: 'uuid' })`、`@IsString()` 验证及 Swagger schema（format: uuid）。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Uuid({ comment: '用户 ID' })
 *   id: string
 * }
 * ```
 */
export function Uuid<T extends object>(options?: UuidOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'uuid' })(target, propertyKey)

    applyDecorators(
      IsString(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          format: 'uuid',
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
