import { ArgumentMetadata, BadRequestException, InternalServerErrorException, PipeTransform } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { Class } from 'type-fest'
import { FilterQueryType } from '../converters/filter-query-type/filter-query-type'
import type { IFilterQuery } from '../converters/filter-query-type/types'


const KNOWN_OPERATORS = new Set([
  'eq',
  'ne',
  'lt',
  'gt',
  'lte',
  'gte',
  'in',
  'nin',
  'some',
  'every',
  'none',
])


function addOperatorPrefix(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = KNOWN_OPERATORS.has(key) ? `$${key}` : key
    result[newKey] = addOperatorPrefix(value)
  }

  return result
}


/**
 * FilterQuery 转换管道，负责将 HTTP 请求中的无前缀操作符（`eq`、`ne`）
 * 转换为内部的 `$eq`、`$ne` 格式，并对数据进行 class-validator 验证。
 *
 * 通常由 `@FilterQuery()` 装饰器内部使用。
 */
export class FilterQueryTransformPipe<T> implements PipeTransform {
  private readonly FilterQueryClass: Class<IFilterQuery<T>>

  constructor(classRef: Class<T>) {
    this.FilterQueryClass = FilterQueryType(classRef)
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<IFilterQuery<T>> {
    if (metadata.type !== 'query') {
      throw new InternalServerErrorException('FilterQueryTransformPipe can only be used to validate query parameters.')
    }

    const raw = value as Record<string, unknown> | undefined

    let filter = raw?.filter
    if (filter === undefined || filter === null) {
      return { filter: undefined } as IFilterQuery<T>
    }

    if (typeof filter === 'string') {
      try {
        filter = JSON.parse(filter) as unknown
      } catch {
        throw new BadRequestException('Invalid filter query: malformed JSON.')
      }
    }

    // 使用 eq 格式验证
    const instance = plainToInstance(this.FilterQueryClass, { filter })
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true })

    if (errors.length > 0) {
      throw new BadRequestException(errors)
    }

    // 验证通过后，转换 eq → $eq
    const prefixed = addOperatorPrefix(filter)
    return { filter: prefixed } as IFilterQuery<T>
  }
}
