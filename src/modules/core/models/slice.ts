import { Cursor } from '@mikro-orm/core'
import { IOffsetPageParameters } from '../types'
import { OffsetPagination } from './offset-pagination'
import { CursorPagination } from './cursor-pagination'


export class Slice<T extends object> {
  data!: Array<T>

  pagination!: OffsetPagination | CursorPagination

  constructor(data: Array<T>, pagination: OffsetPagination | CursorPagination) {
    this.data = data
    this.pagination = pagination
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.data) {
      yield item
    }
  }

  static fromOffset<T extends object>(data: Array<T>, total: number, parameters: IOffsetPageParameters): Slice<T> {
    const pagination = new OffsetPagination(total, parameters)

    return new Slice<T>(data, pagination)
  }

  static fromCursor<T extends object>(cursor: Cursor<T>): Slice<T> {
    const pagination = new CursorPagination(cursor)
    return new Slice<T>(cursor.items, pagination)
  }

  map<R extends object>(fn: (item: T, index: number) => R): Slice<R> {
    const mappedData = this.data.map(fn)
    return new Slice<R>(mappedData, this.pagination)
  }
}
