import { Embeddable, Property } from '@mikro-orm/decorators/legacy'
import { ApiHideProperty } from '@nestjs/swagger'


@Embeddable()
export class BlindIndex {
  @Property({
    type: 'char',
    length: 64,
    comment: '哈希值',
    hidden: true,
  })
  @ApiHideProperty()
  value!: string

  @Property({
    type: 'smallint',
    comment: '哈希算法版本号',
    hidden: true,
  })
  @ApiHideProperty()
  version!: number
}
