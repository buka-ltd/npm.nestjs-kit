import { Varchar } from './varchar.column'
import { Char } from './char.column'
import { Text } from './text.column'
import { Money } from './money.column'
import { Int } from './int.column'
import { Smallint } from './smallint.column'
import { Tinyint } from './tinyint.column'
import { Bigint } from './bigint.column'
import { Double } from './double.column'
import { Numeric } from './numeric.column'
import { Boolean } from './boolean.column'
import { Uuid } from './uuid.column'
import { Timestamptz } from './timestamptz.column'
import { Enum } from './enum.column'
import { Jsonb } from './jsonb.column'
import { Transient } from './transient.column'
import { Embedded } from './embedded.column'


export const Column = {
  Varchar,
  Char,
  Text,
  Money,
  Int,
  Smallint,
  Tinyint,
  Bigint,
  Double,
  Numeric,
  Boolean,
  Uuid,
  Timestamptz,
  Enum,
  Jsonb,
  Transient,
  Embedded,
} as const
