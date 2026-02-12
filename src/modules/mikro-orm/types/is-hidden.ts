import { Hidden } from '@mikro-orm/core'


export type IsHidden<T> = typeof Hidden['__hidden'] extends keyof T ? true : false
