import { Ref } from '@mikro-orm/core'

export type ExcludeRef<T> = T extends Ref<infer U> ? U : T
