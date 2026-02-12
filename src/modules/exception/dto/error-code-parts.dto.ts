import { ErrorCategory } from '@buka/error-codes'
import { Enum, Model, Property } from '~/modules/core/decorators/model'


@Model()
export class ErrorCodePartsDto {
  @Enum({
    type: () => ErrorCategory,
    enumName: 'ErrorCategory',
    schema: { description: '错误分类' },
  })
  category!: ErrorCategory

  @Property({
    schema: {
      type: 'number',
      description: '系统 ID',
    },
  })
  system!: number

  @Property({
    schema: {
      type: 'number',
      description: '模块 ID',
    },
  })
  module!: number

  @Property({
    schema: {
      type: 'number',
      description: '序列号',
    },
  })
  sequence!: number
}
