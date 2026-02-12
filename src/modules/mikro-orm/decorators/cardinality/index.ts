import { ManyToOne } from './many-to-one.cardinality'
import { OneToOne } from './one-to-one.cardinality'
import { OneToMany } from './one-to-many.cardinality'
import { ManyToMany } from './many-to-many.cardinality'


export const Cardinality = {
  ManyToOne,
  OneToOne,
  OneToMany,
  ManyToMany,
} as const
