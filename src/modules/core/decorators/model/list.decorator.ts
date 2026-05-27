import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator'
import { Class } from 'type-fest'
import { CollectionAssociationMetadata } from './association.decorator'
import { ModelRegister } from './model.register'
import { ExcludeScalarClass, ScalarClass, IsScalar, isScalarClass } from '../class-validator/is-scalar'


interface ListOptionsBase {
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
   * 关联元数据，由 Cardinality 装饰器内部传入，通常无需手动设置。
   */
  association?: CollectionAssociationMetadata
}

interface ListOptionsScalar extends ListOptionsBase {
  /**
   * 标量类型：`String` / `Number` / `Boolean`。
   */
  type: ScalarClass
}

interface ListOptionsComposite<T extends Class<object>> extends ListOptionsBase {
  /**
   * 复合类型：`() => Class`。
   */
  type: () => ExcludeScalarClass<T>
}

function applyUntypedList(target: object, propertyKey: string | symbol, options: ListOptionsBase): void {
  const optional = options.optional ?? false
  const schema: ApiPropertyOptions = { type: 'array', ...options.schema }

  IsArray()(target, propertyKey)

  if (optional) {
    IsOptional()(target, propertyKey)
  } else {
    IsNotEmpty({ each: true, message: '$property is required' })(target, propertyKey)
  }

  if (!options.lazy) {
    if (optional) {
      ApiPropertyOptional(schema)(target, propertyKey)
    } else {
      ApiProperty(schema)(target, propertyKey)
    }
  }

  ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
    kind: 'list',
    optional,
    lazy: options.lazy ?? false,
    type: undefined,
    association: options.association,
  })
}

function applyScalarList(target: object, propertyKey: string | symbol, options: ListOptionsScalar): void {
  const optional = options.optional ?? false
  const schema: ApiPropertyOptions = { type: options.type, isArray: true, ...options.schema }

  IsArray()(target, propertyKey)
  IsScalar(options.type, true)(target, propertyKey)

  if (optional) {
    IsOptional()(target, propertyKey)
  } else {
    IsNotEmpty({ each: true, message: '$property is required' })(target, propertyKey)
  }

  if (!options.lazy) {
    if (optional) {
      ApiPropertyOptional(schema)(target, propertyKey)
    } else {
      ApiProperty(schema)(target, propertyKey)
    }
  }

  ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
    kind: 'list',
    optional,
    lazy: options.lazy ?? false,
    type: options.type,
    association: options.association,
  })
}

function applyCompositeList(target: object, propertyKey: string | symbol, options: ListOptionsComposite<any>): void {
  const optional = options.optional ?? false
  const type = options.type as () => Class<object>
  const schema: ApiPropertyOptions = { type: () => type(), isArray: true, ...options.schema }

  ValidateNested({ each: true })(target, propertyKey)
  Type(type)(target, propertyKey)

  if (optional) {
    IsOptional()(target, propertyKey)
  } else {
    IsNotEmpty({ each: true, message: '$property is required' })(target, propertyKey)
  }

  if (!options.lazy) {
    if (optional) {
      ApiPropertyOptional(schema)(target, propertyKey)
    } else {
      ApiProperty(schema)(target, propertyKey)
    }
  }

  ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
    kind: 'list',
    optional,
    lazy: options.lazy ?? false,
    type,
    association: options.association,
  })
}

/**
 * 列表（数组）属性装饰器，支持无类型、标量类型和复合类型三种模式。
 *
 * - 无类型：不指定 `type`，仅校验为数组
 * - 标量类型：`type` 为 `String` / `Number` / `Boolean`
 * - 复合类型：`type` 为 `() => Class`，支持嵌套验证
 *
 * @param options - 列表属性配置
 *
 * @example
 * ```typescript
 * @Model()
 * class UserDTO {
 *   @List({ type: String })
 *   tags: string[]
 *
 *   @List({ type: () => AddressDTO })
 *   addresses: AddressDTO[]
 * }
 * ```
 */
export function List<T extends Class<object>>(options: ListOptionsBase | ListOptionsScalar | ListOptionsComposite<T> = {}): PropertyDecorator {
  return (target, propertyKey) => {
    if (!('type' in options)) return applyUntypedList(target, propertyKey, options)
    if (isScalarClass(options.type)) return applyScalarList(target, propertyKey, options as ListOptionsScalar)
    return applyCompositeList(target, propertyKey, options as ListOptionsComposite<any>)
  }
}
