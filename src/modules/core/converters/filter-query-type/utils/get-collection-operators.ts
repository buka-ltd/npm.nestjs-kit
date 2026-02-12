import { Class } from 'type-fest'
import { FilterQueryOperator, getFilterQueryOperators } from '../decorators'


const FilterQueryCollectionOperators: readonly FilterQueryOperator[] = ['some', 'every', 'none'] as const


export function getCollectionOperators(target: Class<any>, propertyKey: string | symbol): readonly FilterQueryOperator[] {
  const operators = getFilterQueryOperators(target.prototype, propertyKey)
  if (!operators) return FilterQueryCollectionOperators

  return operators.filter((op) => FilterQueryCollectionOperators.includes(op))
}
