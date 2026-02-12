import { Cursor } from '@mikro-orm/core'
import { Model, Property } from '../decorators'


@Model({
  schema: {
    description: '基于游标的分页响应，通过 startCursor/endCursor 定位数据位置，适用于无限滚动等场景',
    additionalProperties: false,
  },
})
export class CursorPagination {
  @Property({
    schema: {
      type: 'number',
      description: '总数',
    },
  })
  total?: number

  @Property({
    schema: {
      type: 'number',
      description: '每页数量',
    },
  })
  limit!: number

  @Property({
    schema: {
      type: 'string',
      description: '开始游标',
      nullable: true,
    },
  })
  startCursor!: string | null

  @Property({
    schema: {
      type: 'string',
      description: '结束游标',
      nullable: true,
    },
  })
  endCursor!: string | null

  @Property({
    schema: {
      type: 'boolean',
      description: '是否有下一页',
    },
  })
  hasNextPage!: boolean

  @Property({
    schema: {
      type: 'boolean',
      description: '是否有上一页',
    },
  })
  hasPrevPage!: boolean

  constructor(cursor: Cursor<any>) {
    this.total = cursor.totalCount
    this.limit = cursor.length
    this.startCursor = cursor.startCursor
    this.endCursor = cursor.endCursor
    this.hasNextPage = cursor.hasNextPage
    this.hasPrevPage = cursor.hasPrevPage
  }
}
