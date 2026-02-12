import { BigIntType, Config, DefineConfig, PrimaryKey, PrimaryKeyProp } from '@mikro-orm/core'
import { IsNumberString } from 'class-validator'
import { TimestampedEntity } from './timestamped-entity.js'
import { Property } from '~/modules/core/decorators/index.js'


export abstract class LinearEntity<Optional = never> extends TimestampedEntity<Optional> {
  [Config]?: DefineConfig<{ forceObject: true }>;
  [PrimaryKeyProp]?: 'id'

  @Property({
    schema: {
      type: 'string',
      description: 'PK',
      example: '1',
      required: true,
    },
  })
  @PrimaryKey({
    type: new BigIntType('string'),
    comment: '主键',
  })
  @IsNumberString()
  id!: string
}
