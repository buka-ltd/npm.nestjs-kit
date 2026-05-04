import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsString } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface TextOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * TEXT 列装饰器，声明一个无长度限制的文本列。
 *
 * 自动应用 MikroORM `@Property({ type: 'text' })`、`@IsString()` 验证及 Swagger schema。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class Article {
 *   @Text({ comment: '文章内容' })
 *   content: string
 * }
 * ```
 */
export function Text<T extends object>(options?: TextOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'text' })(target, propertyKey)

    applyDecorators(
      IsString(),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
