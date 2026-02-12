import { Composite, Model, Property } from '~/modules/core/decorators/model'
import { ErrorCodePartsDto } from './error-code-parts.dto'
import { ErrorCodeMetadataDto } from './error-code-metadata.dto'
import { IsString } from 'class-validator'


@Model()
export class ErrorCodeDefinitionDto {
  @IsString()
  @Property({
    schema: {
      type: 'string',
      description: '错误码（Base32 编码）',
    },
  })
  code!: string

  @IsString()
  @Property({
    schema: {
      type: 'string',
      description: '错误码原始值',
    },
  })
  raw!: string

  @Composite({
    type: () => ErrorCodePartsDto,
    schema: {
      description: '错误码组成部分',
    },
  })
  parts!: ErrorCodePartsDto

  @Composite({
    type: () => ErrorCodeMetadataDto,
    schema: {
      description: '错误码元数据',
    },
  })
  metadata!: ErrorCodeMetadataDto
}
