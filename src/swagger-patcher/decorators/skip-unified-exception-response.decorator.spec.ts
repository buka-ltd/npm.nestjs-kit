import { describe, expect, it } from '@jest/globals'
import { Controller, Get, Post } from '@nestjs/common'
import { DECORATORS } from '~/utils/internals/nestjs-swagger'
import { SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION } from '../constants'
import { SkipUnifiedExceptionResponse } from './skip-unified-exception-response.decorator'

@Controller('method-level')
class MethodLevelController {
  @Get()
  @SkipUnifiedExceptionResponse()
  handler(): void {}
}

@Controller('class-level')
@SkipUnifiedExceptionResponse()
class ClassLevelController {
  @Get()
  first(): void {}

  @Post()
  second(): void {}
}

/** 读取方法上由 ApiExtension 写入的 OpenAPI 扩展 */
function readExtension(controller: object, key: string): unknown {
  const handler = Object.getOwnPropertyDescriptor(controller, key)?.value
  return Reflect.getMetadata(DECORATORS.API_EXTENSION, handler)
}

describe('SkipUnifiedExceptionResponse', () => {
  it('方法级：写入跳过扩展', () => {
    expect(readExtension(MethodLevelController.prototype, 'handler'))
      .toEqual({ [SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION]: true })
  })

  it('类级：写入该类所有路由方法', () => {
    for (const key of ['first', 'second']) {
      expect(readExtension(ClassLevelController.prototype, key))
        .toEqual({ [SKIP_UNIFIED_EXCEPTION_RESPONSE_EXTENSION]: true })
    }
  })
})
