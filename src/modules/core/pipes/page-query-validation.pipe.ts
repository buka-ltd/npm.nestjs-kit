import { ArgumentMetadata, BadRequestException, Injectable, InternalServerErrorException, PipeTransform } from '@nestjs/common'


interface BukaPageQueryValidationPipeOptions {
  mode?: 'cursor' | 'offset'
  optional?: boolean
}

const mixedOffsetAndCursorError = 'Invalid page query: cannot mix offset-based and cursor-based pagination parameters.'
const mixedNextAndLastCursorError = 'Invalid page query: cannot mix next and last cursor pagination parameters.'

/**
 * 分页查询参数验证管道，校验并解析 query string 中的分页参数。
 *
 * 支持 offset 分页（`limit` + `offset`）和 cursor 分页（`after`/`before` + `first`/`last`），
 * 自动将字符串参数转换为数值类型。通常由 `@PageQuery()` 装饰器内部使用。
 *
 * @example
 * ```typescript
 * // 一般通过 @PageQuery() 装饰器间接使用
 * @Get()
 * findAll(@PageQuery('offset') page: { limit: number; offset: number }) {}
 * ```
 */
@Injectable()
export class BukaPageQueryValidationPipe implements PipeTransform {
  constructor(
    private readonly options: BukaPageQueryValidationPipeOptions = { optional: false },
  ) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (metadata.type !== 'query') {
      throw new InternalServerErrorException('BukaPageQueryValidationPipe can only be used to validate query parameters.')
    }

    if (!value.page) {
      if (this.options.optional) {
        return value
      } else {
        throw new BadRequestException('Missing required query parameter: page')
      }
    }

    const mode = this.options.mode

    if ((!mode || mode === 'offset') && ('limit' in value.page || 'offset' in value.page)) {
      if ('after' in value.page || 'first' in value.page || 'before' in value.page || 'last' in value.page) {
        throw new BadRequestException(mixedOffsetAndCursorError)
      }

      const limit = parseInt(value.page.limit, 10)
      const offset = parseInt(value.page.offset, 10)

      if (isNaN(limit) || limit <= 0) {
        throw new BadRequestException('Invalid page query: limit must be a positive integer.')
      }

      if (isNaN(offset) || offset < 0) {
        throw new BadRequestException('Invalid page query: offset must be a non-negative integer.')
      }

      return { page: { limit, offset } }
    }

    if (!mode || mode === 'cursor') {
      if ('after' in value.page || 'first' in value.page) {
        if ('limit' in value.page || 'offset' in value.page) {
          throw new BadRequestException(mixedOffsetAndCursorError)
        }

        if ('before' in value.page || 'last' in value.page) {
          throw new BadRequestException(mixedNextAndLastCursorError)
        }

        const after = value.page.after
        const first = parseInt(value.page.first, 10)

        if (typeof after !== 'string') {
          throw new BadRequestException('Invalid page query: after must be a string.')
        }

        if (isNaN(first) || first <= 0) {
          throw new BadRequestException('Invalid page query: first must be a positive integer.')
        }

        return { page: { after, first } }
      }

      if ('before' in value.page || 'last' in value.page) {
        if ('limit' in value.page || 'offset' in value.page) {
          throw new BadRequestException(mixedOffsetAndCursorError)
        }

        if ('after' in value.page || 'first' in value.page) {
          throw new BadRequestException(mixedNextAndLastCursorError)
        }

        const before = value.page.before
        const last = parseInt(value.page.last, 10)

        if (typeof before !== 'string') {
          throw new BadRequestException('Invalid page query: before must be a string.')
        }

        if (isNaN(last) || last <= 0) {
          throw new BadRequestException('Invalid page query: last must be a positive integer.')
        }

        return { page: { before, last } }
      }
    }

    throw new BadRequestException('Invalid page query: missing pagination parameters.')
  }
}
