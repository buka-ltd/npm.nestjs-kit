/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Class } from 'type-fest'
import { IOrderQuery } from './types'
import { getOrderQuerySchema } from './get-order-query-schema'
import { Property, MatchJsonSchema } from '~/modules/core/decorators'

/**
 * 根据模型类自动生成排序查询 DTO 类型。
 *
 * 生成的类型包含 `orderBy` 属性，其值通过 JSON Schema 校验，确保只能按模型中的属性排序。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 * @returns 包含 `orderBy` 属性的查询 DTO 类
 *
 * @example
 * ```typescript
 * @Model()
 * class User {
 *   @Property()
 *   name: string
 *
 *   @Property()
 *   createdAt: Date
 * }
 *
 * const UserOrderQuery = OrderQueryType(User)
 * // 允许按 name、createdAt 排序
 * ```
 */
export function OrderQueryType<T>(classRef: Class<T>): Class<IOrderQuery<T>> {
  const schema = getOrderQuerySchema(classRef)

  class OrderQueryClass {
    orderBy!: ''
  }

  Property({ optional: true, schema })(OrderQueryClass.prototype, 'orderBy')

  MatchJsonSchema(schema, { message: 'Invalid order query' })(OrderQueryClass.prototype, 'orderBy')

  return OrderQueryClass as any
}
