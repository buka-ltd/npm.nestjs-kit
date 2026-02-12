import { Opt } from '@mikro-orm/core'


export type IsOpt<T> = typeof Opt['__optional'] extends keyof T ? true : false
