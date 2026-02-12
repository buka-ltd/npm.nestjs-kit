
/**
 * 表示该字段是关联到另一个表的实体，而不是 JSON 类型
 */
export type Relation<T = unknown> = T & Relation.Brand

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Relation {
  const __relation: unique symbol
  interface Brand {
    [__relation]?: 1
  }
}
