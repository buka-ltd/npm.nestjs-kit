import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger'
import { IsDefined, IsOptional } from 'class-validator'
import { Class } from 'type-fest'
import { ScalarClass } from '../class-validator/is-scalar'
import { AssociationMetadata } from './association.decorator'
import { ModelRegister } from './model.register'


interface PropertyMetadataBase {
  optional: boolean
  lazy: boolean
  association?: AssociationMetadata
}

export interface ScalarPropertyMetadata extends PropertyMetadataBase {
  kind: 'scalar'
}

export interface CompositePropertyMetadata extends PropertyMetadataBase {
  kind: 'composite'
  type: () => Class<object>
}

export interface ListPropertyMetadata extends PropertyMetadataBase {
  kind: 'list'
  type?: (() => Class<object>) | ScalarClass
}

export interface DictionaryPropertyMetadata extends PropertyMetadataBase {
  kind: 'dictionary'
  type?: (() => Class<object>) | ScalarClass
  map?: boolean
}

export interface EnumPropertyMetadata extends PropertyMetadataBase {
  kind: 'enum'
  type?: () => object
  values?: (string | number)[]
  enumName?: string
}

export type PropertyMetadata
  = | ScalarPropertyMetadata
    | CompositePropertyMetadata
    | ListPropertyMetadata
    | DictionaryPropertyMetadata
    | EnumPropertyMetadata

export type PropertyKind = 'scalar' | 'composite' | 'list' | 'dictionary' | 'enum'


interface ScalarPropertyOptions {
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
}

/**
 * 标量属性装饰器，用于声明模型中的基础类型属性（如 `string`、`number`、`boolean`）。
 *
 * 自动注册属性元数据，并根据 `optional` 和 `schema` 配置应用 class-validator 和 Swagger 装饰器。
 *
 * @param options - 标量属性配置
 *
 * @example
 * ```typescript
 * @Model()
 * class UserDTO {
 *   @Property()
 *   name: string
 *
 *   @Property({ optional: true, schema: { description: '用户年龄' } })
 *   age?: number
 * }
 * ```
 */
export function Property(options: ScalarPropertyOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    if (!('constructor' in target)) {
      throw new TypeError('@Property decorator can only be applied to class properties.')
    }

    if (options.optional) {
      IsOptional()(target, propertyKey)
    } else {
      IsDefined()(target, propertyKey)
    }

    if (options.schema) {
      if (options.optional) {
        ApiPropertyOptional(options.schema)(target, propertyKey)
      } else {
        ApiProperty(options.schema)(target, propertyKey)
      }
    }

    ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
      kind: 'scalar',
      optional: options.optional ?? false,
      lazy: options.lazy ?? false,
    })
  }
}
