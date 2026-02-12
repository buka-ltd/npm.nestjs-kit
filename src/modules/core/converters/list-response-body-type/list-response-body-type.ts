/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Type } from '@nestjs/common'
import { Class } from 'type-fest'
import { IListResponseBody, IListResponseBodyMeta } from './types/list-response-body'
import { Composite, List, serializeModel } from '~/modules/core/decorators'
import { CursorPagination, OffsetPagination, Slice } from '~/modules/core/models'
import { ApiExtraModels, getSchemaPath } from '@nestjs/swagger'


type IListResponseBodyClass<T extends object, MODE extends 'offset' | 'cursor'> = Class<IListResponseBody<T, MODE>> & {
  fromSlice(slice: Slice<T>): IListResponseBody<T, MODE>
}

/**
 * 生成列表响应体类型，将数据包裹在 `{ data: T[], meta: { pagination } }` 结构中。
 *
 * 支持 offset 和 cursor 两种分页模式，通过 `fromSlice()` 静态方法从分页切片创建响应。
 *
 * @param classRef - 列表项的模型类引用
 * @param mode - 分页模式：`'offset'` 或 `'cursor'`，不传则同时支持两种
 * @returns 包含 `data` 和 `meta.pagination` 的列表响应体类
 *
 * @example
 * ```typescript
 * const UserListResponse = ListResponseBodyType(UserDTO, 'offset')
 *
 * @Controller('users')
 * class UserController {
 *   @Get()
 *   async findAll(@PageQuery('offset') page): Promise<UserListResponse> {
 *     const slice = await this.userService.findAll(page)
 *     return UserListResponse.fromSlice(slice)
 *   }
 * }
 * ```
 */
export function ListResponseBodyType<T extends object, MODE extends 'offset' | 'cursor' = 'offset' | 'cursor'>(classRef: Type<T>, mode?: MODE): IListResponseBodyClass<T, MODE> {
  class ResponseBodyMeta {
    pagination: unknown
  }

  class ListResponseBody {
    @List({ type: () => classRef })
    data!: T[]

    meta!: IListResponseBodyMeta<MODE>

    constructor(data: T[], meta: IListResponseBodyMeta<MODE>) {
      this.data = data
      this.meta = meta
    }

    static fromSlice(slice: Slice<T>): ListResponseBody {
      const data = slice.data
      const meta = {
        pagination: slice.pagination,
      }

      const res = new ListResponseBody(data, meta as IListResponseBodyMeta<MODE>)
      return res
    }

    toJSON(): any {
      return {
        data: this.data.map((item) => serializeModel(item, classRef)),
        meta: serializeModel(this.meta, ResponseBodyMeta),
      }
    }
  }

  ApiExtraModels(CursorPagination, OffsetPagination)(ListResponseBody)

  const paginationSchema = mode === 'cursor'
    ? { $ref: getSchemaPath(CursorPagination) }
    : mode === 'offset'
      ? { $ref: getSchemaPath(OffsetPagination) }
      : { oneOf: [{ $ref: getSchemaPath(OffsetPagination) }, { $ref: getSchemaPath(CursorPagination) }] }

  Composite({
    type: () => Object,
    schema: {
      type: 'object',
      properties: { pagination: paginationSchema },
      additionalProperties: true,
      required: ['pagination'],
    },
  })(ListResponseBody.prototype, 'meta')

  return ListResponseBody as IListResponseBodyClass<T, MODE>
}
