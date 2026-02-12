import { Query } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { NextCursorPageSchema, OffsetPageSchema, PreviousCursorPageSchema } from '../constants'
import { BukaPageQueryValidationPipe } from '../pipes'


/**
 * 分页查询参数装饰器，从 query string 中提取并验证分页参数。
 *
 * 支持 offset 分页（`limit` + `offset`）和 cursor 分页（`after`/`before` + `first`/`last`）两种模式。
 * 未指定 `mode` 时同时支持两种分页方式。
 *
 * @param mode - 分页模式：`'cursor'` 或 `'offset'`，不传则同时支持两种
 *
 * @example
 * ```typescript
 * @Controller('users')
 * class UserController {
 *   @Get()
 *   findAll(@PageQuery('offset') page: { limit: number; offset: number }) {
 *     return this.userService.findAll(page)
 *   }
 * }
 * ```
 */
export function PageQuery(mode?: 'cursor' | 'offset'): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('@PageQuery decorator can only be used on method parameters.')
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(target, propertyKey)!

    if (mode === 'offset') {
      ApiQuery({
        name: 'page',
        required: true,
        schema: OffsetPageSchema,
      })(target, propertyKey, descriptor)
    } else if (mode === 'cursor') {
      ApiQuery({
        name: 'page',
        required: true,
        schema: {
          oneOf: [
            NextCursorPageSchema,
            PreviousCursorPageSchema,
          ],
        },
      })(target, propertyKey, descriptor)
    } else {
      ApiQuery({
        name: 'page',
        required: true,
        schema: {
          oneOf: [
            OffsetPageSchema,
            NextCursorPageSchema,
            PreviousCursorPageSchema,
          ],
        },
      })(target, propertyKey, descriptor)
    }

    Query(new BukaPageQueryValidationPipe({ mode }))(target, propertyKey, parameterIndex)
  }
}

/**
 * 可选的分页查询参数装饰器，与 `@PageQuery()` 相同但允许不传分页参数。
 *
 * @param mode - 分页模式：`'cursor'` 或 `'offset'`，不传则同时支持两种
 *
 * @example
 * ```typescript
 * @Controller('users')
 * class UserController {
 *   @Get()
 *   findAll(@OptionalPageQuery('offset') page?: { limit: number; offset: number }) {
 *     return this.userService.findAll(page)
 *   }
 * }
 * ```
 */
export function OptionalPageQuery(mode?: 'cursor' | 'offset'): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('@PageQuery decorator can only be used on method parameters.')
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(target, propertyKey)!

    if (mode === 'offset') {
      ApiQuery({
        name: 'page',
        required: false,
        schema: OffsetPageSchema,
      })(target, propertyKey, descriptor)
    } else if (mode === 'cursor') {
      ApiQuery({
        name: 'page',
        required: false,
        schema: {
          oneOf: [
            NextCursorPageSchema,
            PreviousCursorPageSchema,
          ],
        },
      })(target, propertyKey, descriptor)
    } else {
      ApiQuery({
        name: 'page',
        required: false,
        schema: {
          oneOf: [
            OffsetPageSchema,
            NextCursorPageSchema,
            PreviousCursorPageSchema,
          ],
        },
      })(target, propertyKey, descriptor)
    }

    Query(new BukaPageQueryValidationPipe({ mode, optional: true }))(target, propertyKey, parameterIndex)
  }
}
