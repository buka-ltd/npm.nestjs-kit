export interface IResponseBody<DATA> {
  data: DATA

  meta: {
    [key: string]: any
  }
}
