import { Injectable, Logger } from '@nestjs/common'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { KeyEnvelope } from './entities/key-envelope.embeddable'
import { EncryptedPayload } from './entities/encrypted-payload.embeddable'
import { EnvelopeEncryptionCipher } from './types/envelope-encryption-cipher'
import { DecryptCommand, EncryptCommand } from './commands'
import { stableStringify } from '~/utils/stable-stringify'
import { KmsProvider } from './kms.provider'


/**
 * 信封加密服务 V1 实现
 *
 * 使用 AES-256-GCM 算法，KEK 由 OpenBao Transit 引擎管理
 */
@Injectable()
export class EnvelopeEncryptionV1Cipher implements EnvelopeEncryptionCipher {
  private readonly logger = new Logger(EnvelopeEncryptionV1Cipher.name)

  version = <const>1
  algorithm = <const>'aes-256-gcm'

  constructor(
    private readonly kmsProvider: KmsProvider,
  ) {}


  /**
   * 构建 AAD（附加认证数据）
   * 将 kekId 编码到 AAD 中，确保密文与 kekId 绑定
   */
  private buildAad(kekId: string, extraAad?: Record<string, unknown>): Buffer {
    return Buffer.from(stableStringify({ kekId, ...extraAad }), 'utf8')
  }


  async encrypt(cmd: EncryptCommand): Promise<[KeyEnvelope, EncryptedPayload]> {
    // 1. 从 OpenBao 生成新的数据密钥（DEK）
    const {
      dek,
      encryptedDek,
      kekVersion,
    } = await this.kmsProvider.generateDek(cmd.kekId, 'aes256-gcm96')

    // 2. 生成随机 IV
    const cipherIv = randomBytes(12)

    // 3. 使用 DEK 加密数据
    const cipher = createCipheriv(this.algorithm, dek, cipherIv, {
      authTagLength: 16,
    })

    // 4. 构建 AAD（包含 kekId）
    const aad = this.buildAad(cmd.kekId, cmd.extraAad)
    cipher.setAAD(aad)

    // 5. 加密
    const cipherBlob = Buffer.concat([
      cipher.update(cmd.plaintext),
      cipher.final(),
    ])

    // 6. 获取认证标签
    const cipherTag = cipher.getAuthTag()

    // 7. 清除内存中的 DEK
    dek.fill(0)

    const envelope = new KeyEnvelope()
    envelope.kekId = cmd.kekId
    envelope.kekVersion = kekVersion
    envelope.dek = encryptedDek

    const payload = new EncryptedPayload()
    payload.ciphertext = cipherBlob
    payload.cipherIv = cipherIv
    payload.cipherTag = cipherTag
    payload.cipherVersion = this.version

    return [envelope, payload]
  }

  // async decrypt(envelope: KeyEnvelope, payload: EncryptedPayload, extraAad?: Buffer): Promise<Buffer> {
  async decrypt(cmd: DecryptCommand): Promise<Buffer> {
    if (cmd.payload.cipherVersion !== this.version) {
      throw new Error(`Cipher version mismatch: expected ${this.version}, got ${cmd.payload.cipherVersion}`)
    }

    // 1. 从 OpenBao 解密 DEK
    const dek = await this.kmsProvider.decryptDek(
      cmd.envelope.kekId,
      cmd.envelope.kekVersion,
      cmd.envelope.dek,
    )

    // 2. 使用 DEK 解密数据
    const decipher = createDecipheriv(
      this.algorithm,
      dek,
      cmd.payload.cipherIv,
      { authTagLength: 16 },
    )

    // 3. 构建 AAD（包含 kekId）
    const aad = this.buildAad(cmd.envelope.kekId, cmd.extraAad)
    decipher.setAAD(aad)

    // 4. 设置认证标签
    decipher.setAuthTag(cmd.payload.cipherTag)

    // 5. 解密
    const decrypted = Buffer.concat([
      decipher.update(cmd.payload.ciphertext),
      decipher.final(),
    ])

    // 6. 清除内存中的 DEK
    dek.fill(0)

    return decrypted
  }
}
