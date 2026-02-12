import { CursorPagination, OffsetPagination } from '~/modules/core/models'
import { IResponseBody } from '../../response-body-type'


export type IListResponseBodyMeta<MODE extends 'offset' | 'cursor' = 'offset' | 'cursor'> = {
  pagination: MODE extends 'cursor'
    ? CursorPagination
    : MODE extends 'offset'
      ? OffsetPagination
      : CursorPagination | OffsetPagination

  [key: string]: any
}

export interface IListResponseBody<DATA, MODE extends 'offset' | 'cursor' = 'offset' | 'cursor'> extends IResponseBody<DATA[]> {
  meta: IListResponseBodyMeta<MODE>
}
