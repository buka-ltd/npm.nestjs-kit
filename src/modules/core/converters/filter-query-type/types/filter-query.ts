import { Ref } from '@mikro-orm/core'
import { Relation } from './relation'


export interface IFilterQueryCondition<T> {
  $lt?: T
  $gt?: T
  $lte?: T
  $gte?: T
  $eq?: T
  $ne?: T
  $in?: T[]
  $nin?: T[]
}

export interface IFilterQueryCollectionCondition<T> {
  $some?: IFilterQueryNestedProperty<T>
  $every?: IFilterQueryNestedProperty<T>
  $none?: IFilterQueryNestedProperty<T>
}


export type IFilterQueryNestedProperty<T> = T extends Array<infer U>
  ? IFilterQueryCollectionCondition<U>
  : IFilterQueryObject<T>

export type IFilterQueryProperty<T> = T extends Relation
  ? IFilterQueryNestedProperty<T>
  : IFilterQueryCondition<T>


export type IFilterQueryObject<T> = {
  [K in keyof T as K extends string ? K : never]: IFilterQueryProperty<Exclude<T[K], undefined>>
}

export type IFilter<T> = IFilterQueryObject<T> | undefined

export interface IFilterQuery<T> {
  filter?: IFilterQueryObject<T>
}

// interface Sub {
//   subkey: string
// }

// interface Root {
//   a: string
//   b: string[]
//   c?: Sub

//   child: Sub & Relation
//   arr: Sub[] & Relation
// }


// const root: IFilterQuery<Root> = {
//   filter: {
//     a: { $eq: 'test' },
//     b: { $eq: ['1', '2'] },
//     child: {
//       subkey: { $eq: 'child-test' },
//     },
//     arr: {
//       // $some: {
//       //   subkey: { $eq: 'arr-test' },
//       // },
//     },
//   },
// }
