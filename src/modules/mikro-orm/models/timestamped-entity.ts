import { OptionalProps } from '@mikro-orm/core'
import { Column } from '../decorators/columns/index'


export abstract class TimestampedEntity<Optional = never> {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | Optional

  @Column.Timestamptz({
    onCreate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP',
    comment: '创建时间',
  })
  createdAt: Date = new Date()

  @Column.Timestamptz({
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP',
    comment: '更新时间',
  })
  updatedAt: Date = new Date()
}
