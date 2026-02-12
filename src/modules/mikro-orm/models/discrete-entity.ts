import { Config, DefineConfig, PrimaryKey, PrimaryKeyProp } from '@mikro-orm/core'
import { TimestampedEntity } from './timestamped-entity.js'
import { IsString, IsUUID } from 'class-validator'
import { v7 as uuidv7 } from 'uuid'
import { Property } from '~/modules/core/decorators/index.js'


export abstract class DiscreteEntity<Optional = never> extends TimestampedEntity<Optional> {
  [Config]?: DefineConfig<{ forceObject: true }>;
  [PrimaryKeyProp]?: 'id'

  @IsUUID('7')
  @Property({
    schema: {
      type: 'string',
      description: 'PK',
      example: '1',
      required: true,
    },
  })
  @PrimaryKey({
    type: 'uuid',
    comment: '主键',
  })
  @IsString()
  id: string = uuidv7()
}
