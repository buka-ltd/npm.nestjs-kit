import { QueryOrderMap } from '@mikro-orm/core'

export interface IOrderQuery<T> {
  orderBy?: QueryOrderMap<T> | QueryOrderMap<T>[]
}
