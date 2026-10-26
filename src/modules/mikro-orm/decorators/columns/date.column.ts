import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import type { PropertyOptions } from '@mikro-orm/core'
import { IsISO8601, Matches } from 'class-validator'
import { applyDecorators } from '@nestjs/common'
import { Property } from '~/modules/core/decorators'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface DateOptions<T extends object> extends Omit<PropertyOptions<T>, 'type' | 'columnType'> {
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * DATE 列装饰器，声明一个只含日期的列（无时间、无时区）。
 *
 * 自动应用 MikroORM `@Property({ type: 'date' })`、`@Matches()` + `@IsISO8601({ strict: true })`
 * 验证及 Swagger schema（format: date）。
 *
 * MikroORM `DateType` 在 JS 侧表示为 `YYYY-MM-DD` 字符串，不是 `Date` 对象，也不代表某个绝对时刻。
 *
 * @param options - 列配置
 *
 * @example
 * ```typescript
 * @Entity()
 * class CourseOccurrence {
 *   @Date({ comment: '计划日期' })
 *   date: string
 * }
 * ```
 */
export function Date<T extends object>(options?: DateOptions<T>): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmProperty({ ...options, type: 'date' })(target, propertyKey)

    applyDecorators(
      Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '$property must be a date in YYYY-MM-DD format' }),
      IsISO8601({ strict: true }),
      Property({
        optional: options?.nullable,
        lazy: options?.lazy,
        schema: {
          type: 'string',
          format: 'date',
          description: options?.comment,
          example: options?.example,
          examples: options?.examples,
          required: !options?.nullable,
        },
      }),
    )(target, propertyKey)
  }
}
