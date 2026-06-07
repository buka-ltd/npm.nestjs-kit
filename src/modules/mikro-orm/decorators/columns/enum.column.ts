import type { AnyEntity } from '@mikro-orm/core'
import { Enum as MikroOrmEnum } from '@mikro-orm/decorators/legacy'
import type { EnumOptions } from '@mikro-orm/core'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsDefined, IsOptional } from 'class-validator'
import { IsEnumColumn, ModelRegister, Property } from '~/modules/core/decorators'
import type { SchemaObject } from '~/swagger-patcher/swagger-patcher'


interface ColumnEnumOptions extends Omit<EnumOptions<AnyEntity>, 'type' | 'columnType'> {
  enumName?: string
  example?: SchemaObject['example']
  examples?: SchemaObject['examples']
}

/**
 * 枚举列装饰器，声明一个枚举类型的数据库列。
 *
 * 自动应用 MikroORM `@Enum()` 及 Swagger schema，支持通过 `items` 指定枚举值。
 *
 * @param options - 列配置，必须通过 `items` 指定枚举值数组或返回枚举值的函数
 *
 * @example
 * ```typescript
 * enum Status { Active = 'active', Inactive = 'inactive' }
 *
 * @Entity()
 * class User {
 *   @Enum({ items: () => Status, enumName: 'Status', comment: '用户状态' })
 *   status: Status
 * }
 * ```
 */
export function Enum<T extends object>(options: ColumnEnumOptions): (target: T, propertyName: string) => void {
  return (target, propertyKey) => {
    MikroOrmEnum(options)(target, propertyKey)

    const items = options.items as ((() => (string | number)[]) | (string | number)[])

    if (options.array) {
      IsArray()(target, propertyKey)
      IsEnumColumn(items, { each: true })(target, propertyKey)

      if (options.nullable) {
        IsOptional()(target, propertyKey)
      } else {
        IsDefined()(target, propertyKey)
      }

      if (!options.lazy) {
        const schema = {
          description: options.comment,
          enum: items,
          isArray: true,
          enumName: options.enumName,
          example: options.example,
          examples: options.examples,
          required: !options.nullable,
        }

        if (options.nullable) {
          ApiPropertyOptional(schema)(target, propertyKey)
        } else {
          ApiProperty(schema)(target, propertyKey)
        }
      }

      ModelRegister.addProperty(target.constructor as { new(...args: any[]): T }, propertyKey, {
        kind: 'enum',
        optional: options.nullable ?? false,
        lazy: options.lazy ?? false,
        items,
        enumName: options.enumName,
        array: options.array,
      })
    } else {
      Property({
        optional: options.nullable,
        lazy: options.lazy,
        schema: {
          description: options.comment,
          enum: items,
          enumName: options.enumName,
          example: options.example,
          examples: options.examples,
          required: !options.nullable,
        },
      })(target, propertyKey)
    }
  }
}
