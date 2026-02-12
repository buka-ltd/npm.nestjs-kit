import { IsOptional, IsString } from 'class-validator'
import { Model, Property } from '~/modules/core/decorators/model'


@Model()
export class ErrorCodeMetadataDto {
  @IsString()
  @Property({
    schema: {
      type: 'string',
      description: '模块名称',
    },
  })
  moduleName!: string

  @IsString()
  @Property({
    schema: {
      type: 'string',
      description: '错误短语',
    },
  })
  phrase!: string

  @IsOptional()
  @IsString()
  @Property({
    schema: {
      type: 'string',
      description: '错误描述，包含详细信息和解决方案',
    },
  })
  description?: string
}
