import { Property as MikroOrmProperty, PropertyOptions } from '@mikro-orm/core'
import { IsString, MaxLength } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface VarcharOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  length?: number
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * VARCHAR 列装饰器，声明一个可变长度字符串列。
 *
 * 自动应用 MikroORM `@Property({ type: 'varchar' })`、`@IsString()` 验证及 Swagger schema。
 *
 * @param options - 列配置，支持 `length` 限制最大长度
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Varchar({ length: 255, comment: '用户名' })
 *   name: string
 * }
 * ```
 */
export function Varchar<T extends object>(options?: VarcharOptions<T>): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') throw new TypeError()

    MikroOrmProperty({ ...options, type: 'varchar' })(target, propertyKey)

    applyDecorators(
      ...(options?.length ? [IsString(), MaxLength(options.length)] : [IsString()]),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          maxLength: options?.length,
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
