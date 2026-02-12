export type FilterQueryOperator = 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte' | 'in' | 'nin' | 'some' | 'every' | 'none'


export const FilterQueryOperatorsMetadataKey = 'buka:filter-query-operators'

/**
 * 指定属性在 `FilterQueryType` 中支持的过滤操作符。
 *
 * 如果未使用此装饰器，`FilterQueryType` 将使用默认操作符集合。
 *
 * @param operators - 允许的操作符数组
 *
 * @example
 * ```typescript
 * @Model()
 * class User {
 *   @FilterQueryOperators(['eq', 'ne', 'in'])
 *   @Property()
 *   status: string
 * }
 * ```
 */
export function FilterQueryOperators(operators: FilterQueryOperator[]): PropertyDecorator {
  if (!operators || operators.length === 0) {
    throw new TypeError('FilterQueryOperators: operators array must not be empty')
  }

  return function FilterQueryOperatorsDecorator(target: object, propertyKey: string | symbol): void {
    Reflect.defineMetadata(FilterQueryOperatorsMetadataKey, operators, target, propertyKey)
  }
}

export function getFilterQueryOperators(target: object, propertyKey: string | symbol): readonly FilterQueryOperator[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Reflect.getMetadata(FilterQueryOperatorsMetadataKey, target, propertyKey)
}
