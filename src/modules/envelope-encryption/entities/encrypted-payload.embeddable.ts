import { Embeddable, Hidden, Property } from '@mikro-orm/core'
import { ApiHideProperty } from '@nestjs/swagger'

/**
 * 加密数据的嵌入式实体
 *
 * 包含加密后的数据和解密所需的参数：密文、IV、认证标签和算法版本
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
export class EncryptedPayload {
  /**
   * 加密后的数据（二进制）
   */
  @Property({
    type: 'bytea',
    comment: '加密后的数据',
    hidden: true,
  })
  @ApiHideProperty()
  ciphertext!: Buffer & Hidden

  /**
   * 初始化向量（二进制）
   */
  @Property({
    type: 'bytea',
    comment: '初始化向量',
    hidden: true,
  })
  @ApiHideProperty()
  cipherIv!: Buffer & Hidden

  /**
   * 认证标签（二进制，用于 GCM 模式验证数据完整性）
   */
  @Property({
    type: 'bytea',
    comment: '认证标签',
    hidden: true,
  })
  @ApiHideProperty()
  cipherTag!: Buffer & Hidden

  /**
   * 加密算法版本号
   */
  @Property({
    type: 'smallint',
    comment: '加密算法版本号',
    default: 1,
    hidden: true,
  })
  @ApiHideProperty()
  cipherVersion: number & Hidden = 1
}
