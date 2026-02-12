import { Model, Property } from '../decorators'


@Model({
  schema: {
    description: '基于偏移量的分页响应，通过 offset + limit 定位数据位置，适用于传统翻页场景',
    additionalProperties: false,
  },
})
export class OffsetPagination {
  @Property({
    schema: {
      type: 'number',
      description: '总数',
    },
  })
  total!: number

  @Property({
    schema: {
      type: 'number',
      description: '每页数量',
    },
  })
  limit!: number

  @Property({
    schema: {
      type: 'number',
      description: '偏移量',
    },
  })
  offset!: number

  constructor(total: number, parameters: { limit: number; offset: number }) {
    this.total = total
    this.limit = parameters.limit
    this.offset = parameters.offset
  }
}
