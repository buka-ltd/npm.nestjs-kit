import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator'
import { Class } from 'type-fest'
import { RefAssociationMetadata } from './association.decorator'
import { ModelRegister } from './model.register'


interface CompositeOptions {
  /**
   * 复合类型的 class 引用，使用延迟求值函数 `() => Class` 以避免循环依赖。
   */
  type: () => Class<object>
  /**
   * 是否可选。为 `true` 时自动应用 `@IsOptional()` 和 `@ApiPropertyOptional()`。
   */
  optional?: boolean
  /**
   * 标记该属性为懒加载。懒加载属性存在除 `undefined` 之外的第三种状态——"未加载"，
   * 即该属性并非不存在，而是尚未被加载。可通过 `EagerType()` converter 从 DTO 中排除这些字段。
   *
   * 在 MikroORM 场景下，对应 `lazy: true` 的列，查询时不会默认 SELECT 该列，需显式 `populate` 才会加载。
   */
  lazy?: boolean
  /**
   * 自定义 Swagger schema 配置，透传给 `@ApiProperty()` / `@ApiPropertyOptional()`。
   */
  schema?: ApiPropertyOptions
  /**
   * 关联元数据，由 Cardinality 装饰器内部传入，通常无需手动设置。
   */
  association?: RefAssociationMetadata
}

/**
 * 复合类型属性装饰器，用于声明嵌套对象类型的属性。
 *
 * 自动应用 `@ValidateNested()`、`@Type()` 以及 Swagger schema 配置，支持递归验证嵌套对象。
 *
 * @param options - 复合类型配置，必须通过 `type` 指定嵌套类的引用
 *
 * @example
 * ```typescript
 * @Model()
 * class AddressDTO {
 *   @Property()
 *   city: string
 * }
 *
 * @Model()
 * class UserDTO {
 *   @Composite({ type: () => AddressDTO })
 *   address: AddressDTO
 * }
 * ```
 */
export function Composite(options: CompositeOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const optional = options.optional ?? false
    const schema: ApiPropertyOptions = { type: () => options.type(), ...options.schema }

    ValidateNested()(target, propertyKey)
    if (optional) {
      IsOptional()(target, propertyKey)
    } else {
      IsNotEmpty({ message: '$property is required' })(target, propertyKey)
    }

    Type(options.type)(target, propertyKey)

    if (optional) {
      ApiPropertyOptional(schema)(target, propertyKey)
    } else {
      ApiProperty(schema)(target, propertyKey)
    }

    ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
      kind: 'composite',
      optional,
      lazy: options.lazy ?? false,
      type: options.type,
      association: options.association,
    })
  }
}
