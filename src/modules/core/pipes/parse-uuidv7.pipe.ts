import { BadRequestException, PipeTransform } from '@nestjs/common'
import { validate as uuidValidate, version as uuidVersion } from 'uuid'


/**
 * UUIDv7 格式验证管道，校验输入字符串是否为合法的 UUIDv7。
 *
 * 若校验失败则抛出 `BadRequestException`。
 *
 * @example
 * ```typescript
 * @Controller('users')
 * class UserController {
 *   @Get(':id')
 *   findOne(@Param('id', ParseUUIDv7Pipe) id: string) {
 *     return this.userService.findOne(id)
 *   }
 * }
 * ```
 */
export class ParseUUIDv7Pipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!uuidValidate(value) || uuidVersion(value) !== 7) {
      throw new BadRequestException('Validation failed (UUIDv7 is expected)')
    }

    return value
  }
}
