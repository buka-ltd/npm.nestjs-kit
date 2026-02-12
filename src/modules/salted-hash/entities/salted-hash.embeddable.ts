import { Embeddable, Hidden, Property } from '@mikro-orm/core'
import { ApiHideProperty } from '@nestjs/swagger'


/**
 * SaltedHash 嵌入实体，用于在 MikroORM Entity 中存储加盐哈希结果。
 *
 * - `hash`: 哈希字符串
 * - `version`: 哈希算法版本号，便于后续升级算法时做兼容处理
 */
@Embeddable()
export class SaltedHash {
  @Property({
    type: 'varchar',
    length: 255,
    comment: '哈希值',
    hidden: true,
  })
  @ApiHideProperty()
  hash!: string & Hidden

  @Property({
    type: 'smallint',
    comment: '哈希算法版本号',
    hidden: true,
  })
  @ApiHideProperty()
  version!: number & Hidden
}
