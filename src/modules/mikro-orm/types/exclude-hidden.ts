import { Hidden } from '@mikro-orm/core'

export type ExcludeHidden<T> = T extends infer U & Hidden ? U : T
