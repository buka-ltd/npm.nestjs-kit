import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger'
import { Type, Transform, plainToInstance } from 'class-transformer'
import { IsObject, IsOptional, ValidateNested } from 'class-validator'
import { Class } from 'type-fest'
import { AssociationMetadata } from './association.decorator'
import { ModelRegister } from './model.register'
import { ExcludeScalarClass, ScalarClass, IsScalar, isScalarClass } from '../class-validator/is-scalar'
import { IsScalarDictionary } from '../class-validator/is-scalar-dictionary'
import { ValidateNestedDictionary } from '../class-validator/validate-nested-dictionary'


const SCALAR_SWAGGER_TYPE_MAP: Record<string, string> = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
}

interface DictionaryOptionsBase {
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
  association?: AssociationMetadata

  /**
   * 启用 Map 模式。为 `true` 时使用 `Map<string, T>` 代替 `Record<string, T>`，
   * 复用 class-validator / class-transformer 的原生 Map 支持，可获得完整的嵌套错误路径。
   *
   * @default false
   */
  map?: boolean
}

interface DictionaryOptionsScalar extends DictionaryOptionsBase {
  /**
   * 标量类型：`String` / `Number` / `Boolean`。
   */
  type: ScalarClass
}

interface DictionaryOptionsComposite<T extends Class<object>> extends DictionaryOptionsBase {
  /**
   * 复合类型：`() => Class`。
   */
  type: () => ExcludeScalarClass<T>
}

function applyUntypedDictionary(target: object, propertyKey: string | symbol, options: DictionaryOptionsBase): void {
  const optional = options.optional ?? false
  const schema = { type: 'object', additionalProperties: true, ...options.schema } as ApiPropertyOptions

  IsObject()(target, propertyKey)

  if (optional) {
    IsOptional()(target, propertyKey)
  }

  if (optional) {
    ApiPropertyOptional(schema)(target, propertyKey)
  } else {
    ApiProperty(schema)(target, propertyKey)
  }

  ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
    kind: 'dictionary',
    optional,
    lazy: options.lazy ?? false,
    type: undefined,
    map: options.map ?? false,
    association: options.association,
  })
}

function applyScalarDictionary(target: object, propertyKey: string | symbol, options: DictionaryOptionsScalar): void {
  const optional = options.optional ?? false
  const map = options.map ?? false
  const schema = {
    type: 'object',
    additionalProperties: { type: SCALAR_SWAGGER_TYPE_MAP[options.type.name] },
    ...options.schema,
  } as ApiPropertyOptions

  IsObject()(target, propertyKey)
  if (map) {
    IsScalar(options.type, true)(target, propertyKey)
  } else {
    IsScalarDictionary(options.type)(target, propertyKey)
  }

  if (optional) {
    IsOptional()(target, propertyKey)
  }

  if (optional) {
    ApiPropertyOptional(schema)(target, propertyKey)
  } else {
    ApiProperty(schema)(target, propertyKey)
  }

  ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
    kind: 'dictionary',
    optional,
    lazy: options.lazy ?? false,
    type: options.type,
    map,
    association: options.association,
  })
}

function applyCompositeDictionary(target: object, propertyKey: string | symbol, options: DictionaryOptionsComposite<any>): void {
  const optional = options.optional ?? false
  const map = options.map ?? false
  const schema = { type: 'object', additionalProperties: true, ...options.schema } as ApiPropertyOptions

  if (map) {
    ValidateNested({ each: true })(target, propertyKey)
    Type(options.type)(target, propertyKey)
  } else {
    IsObject()(target, propertyKey)
    Transform(({ value }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      if (value == null || typeof value !== 'object' || Array.isArray(value)) return value
      const cls = options.type()
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, v instanceof cls ? v : plainToInstance(cls, v)]),
      )
    }, { toClassOnly: true })(target, propertyKey)
    ValidateNestedDictionary(options.type)(target, propertyKey)
  }

  if (optional) {
    IsOptional()(target, propertyKey)
  }

  if (optional) {
    ApiPropertyOptional(schema)(target, propertyKey)
  } else {
    ApiProperty(schema)(target, propertyKey)
  }

  ModelRegister.addProperty(target.constructor as Class<any>, propertyKey, {
    kind: 'dictionary',
    optional,
    lazy: options.lazy ?? false,
    type: options.type,
    map,
    association: options.association,
  })
}

/**
 * 字典（键值对）属性装饰器，支持无类型、标量类型和复合类型三种模式。
 *
 * - 无类型：不指定 `type`，仅校验为对象
 * - 标量类型：`type` 为 `String` / `Number` / `Boolean`
 * - 复合类型：`type` 为 `() => Class`，支持嵌套验证
 *
 * @param options - 字典属性配置
 *
 * @example
 * ```typescript
 * @Model()
 * class UserDTO {
 *   @Dictionary({ type: String })
 *   metadata: Record<string, string>
 *
 *   @Dictionary({ type: () => AddressDTO, optional: true })
 *   addressMap?: Record<string, AddressDTO>
 * }
 * ```
 */
export function Dictionary<T extends Class<object>>(options: DictionaryOptionsBase | DictionaryOptionsScalar | DictionaryOptionsComposite<T> = {}): PropertyDecorator {
  return (target, propertyKey) => {
    if (!('type' in options)) return applyUntypedDictionary(target, propertyKey, options)
    if (isScalarClass(options.type)) return applyScalarDictionary(target, propertyKey, options as DictionaryOptionsScalar)
    return applyCompositeDictionary(target, propertyKey, options as DictionaryOptionsComposite<any>)
  }
}
