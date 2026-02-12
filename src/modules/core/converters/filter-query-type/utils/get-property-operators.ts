import { Class } from 'type-fest'
import { FilterQueryOperator, getFilterQueryOperators } from '../decorators'


const FilterQueryPropertyOperators: readonly FilterQueryOperator[] = ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin'] as const


export function getPropertyOperators(target: Class<any>, propertyKey: string | symbol): readonly FilterQueryOperator[] {
  const operators = getFilterQueryOperators(target.prototype, propertyKey)
  if (!operators) return FilterQueryPropertyOperators

  return operators.filter((op) => FilterQueryPropertyOperators.includes(op))
}

