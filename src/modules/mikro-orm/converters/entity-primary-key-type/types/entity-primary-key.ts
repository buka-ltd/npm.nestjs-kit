import { Primary, PrimaryProperty } from '@mikro-orm/core'


export type IEntityPrimaryKey<T extends object> = {
  [K in keyof T as K extends PrimaryProperty<T> ? K : never]: Primary<T>
}
