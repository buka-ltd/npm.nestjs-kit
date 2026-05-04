import { Embeddable, Property } from '@mikro-orm/decorators/legacy'
import { Hidden, HiddenProps } from '@mikro-orm/core'
import { ApiHideProperty } from '@nestjs/swagger'

/**
 * 密钥信封的嵌入式实体
 *
 * 包含密钥相关的元数据：kekId、KEK 版本号和加密的数据密钥（DEK）
 *
 * @example
 * ```typescript
 * @Entity()
 * export class UserSecret extends DiscreteEntity {
 *   @Column.Embedded(() => KeyEnvelope, { object: false })
 *   envelope!: KeyEnvelope
 *
 *   @Column.Embedded(() => EncryptedPayload)
 *   payload!: EncryptedPayload
 * }
 * ```
 */
@Embeddable()
export class KeyEnvelope {
  [HiddenProps]?: 'dek';

  /**
   * 加密数据的唯一标识符，用于 AAD 绑定
   */
  @Property({
    type: 'varchar',
    length: 64,
    comment: '加密数据的唯一标识符，用于 AAD 绑定',
    hidden: true,
  })
  @ApiHideProperty()
  kekId!: string & Hidden

  /**
   * KEK 版本号，用于密钥轮换追踪
   */
  @Property({
    type: 'smallint',
    comment: 'KEK 版本号',
    hidden: true,
  })
  @ApiHideProperty()
  kekVersion!: number & Hidden

  /**
   * 加密的数据密钥（由 KEK 加密，二进制格式）
   */
  @Property({
    type: 'bytea',
    comment: '加密的数据密钥（由 KEK 加密）',
    hidden: true,
  })
  @ApiHideProperty()
  dek!: Buffer
}
