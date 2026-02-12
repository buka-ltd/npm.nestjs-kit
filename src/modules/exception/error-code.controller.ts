import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ErrorCode, ErrorCategory } from '@buka/error-codes'
import { Slice } from '~/modules/core/models'
import { ErrorCodeRegistry } from './error-code.registry.js'
import { ErrorCodeDefinitionDto } from './dto/error-code-definition.dto.js'
import { ListErrorCodesResponseDto } from './dto/list-error-codes-response.dto'


@ApiTags('ErrorCodes')
@Controller('error-codes')
export class ErrorCodeController {
  @Get()
  @ApiOperation({ summary: '获取所有已注册的错误码列表' })
  @ApiOkResponse({ type: ListErrorCodesResponseDto })
  @Version(VERSION_NEUTRAL)
  list(): ListErrorCodesResponseDto {
    const registry = ErrorCodeRegistry.getInstance()
    const systemId = registry.getSystemId()
    const codes = registry.getAllRegisteredCodes()

    const errors = Array.from(codes.entries()).map(([key, className]) => {
      const [categoryStr, moduleIdStr, sequenceIdStr] = key.split('-')
      const category = Number(categoryStr) as ErrorCategory
      const moduleId = Number(moduleIdStr)
      const sequenceId = Number(sequenceIdStr)

      const errorCode = new ErrorCode({ category, systemId, moduleId, sequenceId })

      const [moduleName, phrase] = className.split('.')

      const item = new ErrorCodeDefinitionDto()
      item.code = errorCode.toString()
      item.raw = errorCode.toBigInt().toString()
      item.parts = {
        category,
        system: systemId,
        module: moduleId,
        sequence: sequenceId,
      }
      const description = registry.getDescription(key)
      item.metadata = {
        moduleName: moduleName ?? className,
        phrase: phrase ?? '',
        description,
      }

      return item
    })

    const slice = Slice.fromOffset(errors, errors.length, { limit: errors.length, offset: 0 })
    return ListErrorCodesResponseDto.fromSlice(slice)
  }
}
