import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger'
import { IsEnum, IsIn, IsOptional } from 'class-validator'
import { Class } from 'type-fest'
import { ModelRegister } from './model.register'


interface EnumOptionsBase {
  /**
   * 是否可选。为 `true` 时自动应用 `@IsOptional()` 和 `@ApiPropertyOptional()`。
   */
  optional?: boolean

  /**
   * 标记该属性为懒加载。懒加载属性存在除 `undefined` 之外的第三种状态——"未加载"，
   * 即该属性并非不存在，而是尚未被加载。懒加载属性默认不注册 Swagger schema，
   * 因此不会出现在 API 文档中。如需包含，请在派生 DTO 中手动声明。
   *
   * 在 MikroORM 场景下，对应 `lazy: true` 的列，查询时不会默认 SELECT 该列，需显式 `populate` 才会加载。
   */
  lazy?: boolean

  /**
   * 自定义 Swagger schema 配置，透传给 `@ApiProperty()` / `@ApiPropertyOptional()`。
   */
  schema?: ApiPropertyOptions

  /**
   * Swagger 中枚举的名称，用于生成 `$ref` 引用的命名 schema。
   * 例如 `enumName: 'Status'` 会在 Swagger 的 components/schemas 中生成命名枚举。
   */
  enumName?: string
}

interface EnumOptionsTyped extends EnumOptionsBase {
  /**
   * 枚举类型的延迟求值函数，传入 `() => EnumObject` 以避免循环依赖。
   * 内部使用 `@IsEnum()` 进行校验。
   */
  type: () => object
  values?: never
}

interface EnumOptionsValues extends EnumOptionsBase {
  /**
   * 枚举的允许值数组。内部使用 `@IsIn()` 进行校验。
   */
  values: (string | number)[]
  type?: never
}

type EnumOptions = EnumOptionsTyped | EnumOptionsValues

/**
 * 枚举属性装饰器，支持 TypeScript enum 对象和值数组两种方式。
 *
 * @example
 * ```typescript
 * enum Status { Active = 'active', Inactive = 'inactive' }
 *
 * class MyModel {
 *   // 方式1: 传入 TS enum
 *   @Enum({ type: () => Status })
 *   status: Status
 *
 *   // 方式2: 传入值数组
 *   @Enum({ values: ['low', 'medium', 'high'] })
 *   priority: string
 * }
 * ```
 */
export function Enum(options: EnumOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    if (!('constructor' in target)) {
      throw new TypeError('@Enum decorator can only be applied to class properties.')
    }

    const optional = options.optional ?? false

    if ('type' in options && options.type) {
      const enumObj = options.type()
      IsEnum(enumObj)(target, propertyKey)
    } else if ('values' in options && options.values) {
      IsIn(options.values)(target, propertyKey)
    }

    if (optional) {
      IsOptional()(target, propertyKey)
    }

    const enumValues = options.type ? Object.values(options.type()) : options.values
    const schema: ApiPropertyOptions = {
      enum: enumValues,
      ...(options.enumName ? { enumName: options.enumName } : {}),
      ...options.schema,
    }

    if (optional) {
      ApiPropertyOptional(schema)(target, propertyKey)
    } else {
      ApiProperty(schema)(target, propertyKey)
    }

    ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
      kind: 'enum',
      optional,
      lazy: options.lazy ?? false,
      ...(options.type ? { type: options.type } : {}),
      ...('values' in options && options.values ? { values: options.values } : {}),
      ...(options.enumName ? { enumName: options.enumName } : {}),
    })
  }
}
