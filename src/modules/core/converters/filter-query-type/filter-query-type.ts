import * as R from 'ramda'
import type { IFilterQueryObject, IFilterQuery } from './types'
import * as ClassValidatorUtils from '~/utils/class-validator-utils'
import * as ClassTransformerUtils from '~/utils/class-transformer-utils'
import { getFilterQueryOperators } from './decorators'
import { Composite, HasAnyKey, ModelRegister } from '~/modules/core/decorators'
import { isScalarClass } from '~/modules/core/decorators/class-validator/is-scalar'
import { ArrayMinSize, IS_OPTIONAL, IsArray, IsOptional } from 'class-validator'
import { Class } from 'type-fest'
import { getPropertyOperators, getCollectionOperators } from './utils'
import { getFilterQuerySchema } from './get-filter-query-schema'


function createFilterQueryPropertyClassRef(classRef: Class<any>, propertyKey: string): Class<any> {
  const propertyClass = class FilterQueryPropertyClass {}
  ModelRegister.addModel(propertyClass)

  const propertyMetadata = ModelRegister.getProperty(classRef, propertyKey)

  const validationMetadataList = ClassValidatorUtils.getMetadata(classRef, propertyKey)
    // 跳过 IsOptional，手动添加
    // 这不仅仅是为了避免重复添加
    // 也是因为 IsOptional 复制无法被复制
    // 详见 https://github.com/typestack/class-validator/blob/develop/src/decorator/common/IsOptional.ts
    .filter((metadata) => metadata.name !== IS_OPTIONAL)

  const transformerMetadataList = ClassTransformerUtils.getTransformMetadata(classRef, propertyKey) || []
  const operators = getPropertyOperators(classRef, propertyKey)

  for (const operator of operators) {
    if (['in', 'nin'].includes(operator)) {
      // in, nin — 需要构造完整的 ListPropertyMetadata
      const listMetadata = propertyMetadata
        && (propertyMetadata.kind === 'composite' || propertyMetadata.kind === 'list' || propertyMetadata.kind === 'dictionary')
        && propertyMetadata.type
        && !isScalarClass(propertyMetadata.type)
        ? { kind: 'list' as const, optional: true, lazy: false, type: propertyMetadata.type }
        : { kind: 'scalar' as const, optional: true, lazy: false }
      ModelRegister.addProperty(propertyClass, operator, listMetadata)

      IsArray()(propertyClass.prototype, operator)
      ArrayMinSize(1)(propertyClass.prototype, operator)

      for (const metadata of validationMetadataList) {
        ClassValidatorUtils.setMetadata(propertyClass, operator, { ...metadata, each: true })
      }

      for (const metadata of transformerMetadataList) {
        // 需要将 transformFn 修改为数组版本
        const transformFn = metadata.transformFn
        ClassTransformerUtils.setTransformMetadata(propertyClass, operator, {
          ...metadata,
          transformFn: function FilterQueryPropertyTransformer(params) {
            if (Array.isArray(params.value)) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return params.value.map((v, i, arr) => transformFn({ ...params, value: v, key: i, obj: arr }))
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return params.value
          },
        })
      }
    } else {
      // eq, ne, lt, gt, lte, gte — scalar 操作符
      ModelRegister.addProperty(propertyClass, operator, { kind: 'scalar', optional: true, lazy: false })

      for (const metadata of validationMetadataList) {
        ClassValidatorUtils.setMetadata(propertyClass, operator, metadata)
      }

      for (const metadata of transformerMetadataList) {
        ClassTransformerUtils.setTransformMetadata(propertyClass, operator, metadata)
      }
    }

    IsOptional()(propertyClass.prototype, operator)
  }

  return propertyClass
}

function createFilterQueryObjectClassRef(classRef: Class<any>): Class<any> {
  class FilterQueryObjectClass {}
  ModelRegister.addModel(FilterQueryObjectClass)

  for (const propertyKey of ModelRegister.getModelPropertyKeys(classRef)) {
    if (typeof propertyKey !== 'string') continue

    const propertyMetadata = ModelRegister.getProperty(classRef, propertyKey)
    const isCollection = propertyMetadata?.association?.kind === '1:m' || propertyMetadata?.association?.kind === 'm:n'
    const isRelation = !!propertyMetadata?.association
    const isOptional = !!propertyMetadata?.optional

    if (isRelation) {
      if (isCollection) {
        // some, none, every
        class FilterQueryCollectionClass {}
        ModelRegister.addModel(FilterQueryCollectionClass)

        const sub = createFilterQueryObjectClassRef(propertyMetadata.association!.type() as Class<any>)
        const operators = getCollectionOperators(classRef, propertyKey)

        for (const operator of operators) {
          Composite({ type: () => sub, optional: true })(FilterQueryCollectionClass.prototype, operator)
          if (!isOptional) {
            HasAnyKey(getFilterQueryOperators(classRef, propertyKey))(FilterQueryCollectionClass.prototype, operator)
          }

          IsOptional()(FilterQueryCollectionClass.prototype, operator)
        }
        Composite({ type: () => FilterQueryCollectionClass, optional: isOptional })(FilterQueryObjectClass.prototype, propertyKey)
        if (!isOptional) HasAnyKey(operators)(FilterQueryObjectClass.prototype, propertyKey)
      } else {
        const sub = createFilterQueryObjectClassRef(propertyMetadata.association!.type() as Class<any>)
        Composite({ type: () => sub, optional: isOptional })(FilterQueryObjectClass.prototype, propertyKey)
      }
    } else {
      // eq, ne, lt, gt, lte, gte, in, nin
      const propertyClass = createFilterQueryPropertyClassRef(classRef, propertyKey)

      Composite({
        type: () => propertyClass,
        optional: isOptional,
      })(FilterQueryObjectClass.prototype, propertyKey)

      if (!isOptional) {
        const operators = getPropertyOperators(classRef, propertyKey)
        HasAnyKey(operators)(FilterQueryObjectClass.prototype, propertyKey)
      }
    }
  }

  return FilterQueryObjectClass
}

/**
 * 根据模型类自动生成带过滤操作符的查询 DTO 类型。
 *
 * 为模型的每个属性生成 `eq`、`ne`、`lt`、`gt`、`in` 等操作符，
 * 可通过 `@FilterQueryOperators()` 自定义每个属性支持的操作符。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 * @returns 包含 `filter` 属性的查询 DTO 类
 *
 * @example
 * ```typescript
 * @Model()
 * class User {
 *   @Property()
 *   name: string
 *
 *   @Property()
 *   age: number
 * }
 *
 * const UserFilterQuery = FilterQueryType(User)
 * // 生成类型: { filter: { name?: { eq?: string, in?: string[], ... }, age?: { gt?: number, ... } } }
 * ```
 */
export function FilterQueryType<T>(classRef: Class<T>): Class<IFilterQuery<T>> {
  if (!ModelRegister.isModel(classRef)) {
    throw new TypeError('FilterQueryType only accepts a class annotated with @Model().')
  }

  const FilterQueryObjectClass = createFilterQueryObjectClassRef(classRef)

  const properties = ModelRegister.getProperties(FilterQueryObjectClass)
  const isRequired = R.any((p) => !p.optional, properties)

  class FilterQueryClass {
    filter!: IFilterQueryObject<T>
  }

  ModelRegister.addModel(FilterQueryObjectClass)
  Composite({
    type: () => FilterQueryObjectClass,
    optional: !isRequired,
    schema: getFilterQuerySchema(classRef),
  })(FilterQueryClass.prototype, 'filter')

  return FilterQueryClass as Class<IFilterQuery<T>>
}
