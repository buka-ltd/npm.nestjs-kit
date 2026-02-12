import { Opt } from '@mikro-orm/core'

export type ExcludeDefinedOpt<T> = T extends infer E & Opt ? E : T
export type ExcludeOpt<T> = ExcludeDefinedOpt<Exclude<T, undefined>>
