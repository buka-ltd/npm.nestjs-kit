export type IOffsetPageParameters = {
  limit: number
  offset: number
}

export type INextCursorPageParameters = {
  first: number
  after: string
}

export type IPreviousCursorPageParameters = {
  last: number
  before: string
}


export type IPageQuery<T extends 'cursor' | 'offset' = 'cursor' | 'offset'> = {
  page: T extends 'cursor'
    ? INextCursorPageParameters | IPreviousCursorPageParameters
    : T extends 'offset'
      ? IOffsetPageParameters
      : INextCursorPageParameters | IPreviousCursorPageParameters | IOffsetPageParameters
}
