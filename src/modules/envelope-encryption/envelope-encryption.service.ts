import { Inject, Injectable, Logger } from '@nestjs/common'
import { DecryptCommand, EncryptBufferCommand, EncryptCommand, EncryptStringCommand, ReencryptCommand } from './commands'
import { EnvelopeEncryptionV1Cipher } from './envelope-encryption-v1.cipher'
import { KeyEnvelope } from './entities/key-envelope.embeddable'
import { EncryptedPayload } from './entities/encrypted-payload.embeddable'
import { EnvelopeEncryptionCipher } from './types/envelope-encryption-cipher'
import { type EnvelopeEncryptionModuleOptions } from './types/envelope-encryption-module-options'
import { MODULE_OPTIONS_TOKEN } from './envelope-encryption.module-definition'
import { CipherMetadata } from './types/cipher-metadata'


/**
 * 信封加密服务，基于信封加密模式（Envelope Encryption）提供数据加密、解密和重新加密能力。
 *
 * 使用 KEK（Key Encryption Key）保护 DEK（Data Encryption Key），支持多版本加密算法。
 *
 * @example
 * ```typescript
 * // 加密
 * const [envelope, payload] = await envelopeEncryptionService.encrypt({
 *   kekId: 'kek-001',
 *   plaintext: '敏感数据',
 * })
 *
 * // 解密
 * const plaintext = await envelopeEncryptionService.decryptToString({
 *   envelope,
 *   payload,
 * })
 * ```
 */
@Injectable()
export class EnvelopeEncryptionService {
  private readonly logger = new Logger(EnvelopeEncryptionService.name)

  private readonly ciphers = new Map<number, EnvelopeEncryptionCipher>()
  private readonly defaultCipher: EnvelopeEncryptionCipher

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: EnvelopeEncryptionModuleOptions,

    private readonly cipherV1: EnvelopeEncryptionV1Cipher,
  ) {
    this.ciphers.set(this.cipherV1.version, this.cipherV1)

    const version = this.options.version ?? 1

    const defaultCipher = this.ciphers.get(version)

    if (!defaultCipher) {
      throw new Error(`Unsupported default cipher version: ${this.options.version}`)
    }

    this.defaultCipher = defaultCipher
  }

  private isEncryptStringCommand(cmd: EncryptCommand): cmd is EncryptStringCommand {
    return typeof cmd.plaintext === 'string'
  }

  /**
   * 使用信封加密模式加密数据，支持字符串和 Buffer 输入。
   *
   * @param cmd - 加密命令，包含 KEK ID 和明文数据
   * @returns 密钥信封和加密载荷的元组
   */
  async encrypt(cmd: EncryptStringCommand): Promise<[KeyEnvelope, EncryptedPayload]>
  async encrypt(cmd: EncryptBufferCommand): Promise<[KeyEnvelope, EncryptedPayload]>
  async encrypt(cmd: EncryptCommand): Promise<[KeyEnvelope, EncryptedPayload]> {
    // 转换成二进制数据
    const plaintextBuffer = this.isEncryptStringCommand(cmd)
      ? Buffer.from(cmd.plaintext, cmd.encoding || 'utf8')
      : cmd.plaintext

    return this.defaultCipher.encrypt({
      kekId: cmd.kekId,
      plaintext: plaintextBuffer,
      extraAad: cmd.extraAad,
    })
  }

  /**
   * 解密数据，自动匹配加密时使用的算法版本。
   *
   * @param cmd - 解密命令，包含密钥信封和加密载荷
   * @returns 解密后的 Buffer
   */
  async decrypt(cmd: DecryptCommand): Promise<Buffer> {
    const cipher = this.ciphers.get(cmd.payload.cipherVersion)
    if (!cipher) {
      throw new Error(`Unsupported cipher version: ${cmd.payload.cipherVersion}`)
    }
    return cipher.decrypt(cmd)
  }

  /**
   * 重新加密数据（使用最新版本的 KEK 和算法）
   *
   * @returns 使用新 KEK 加密的结果
   */
  async reencrypt(cmd: ReencryptCommand): Promise<[KeyEnvelope, EncryptedPayload]> {
    const plaintext = await this.decrypt({ envelope: cmd.envelope, payload: cmd.payload, extraAad: cmd.extraAad })

    return this.encrypt({ kekId: cmd.keyId, plaintext, extraAad: cmd.extraAad })
  }

  /**
   * 解密为字符串
   *
   * @returns 解密后的字符串
   */
  async decryptToString(cmd: DecryptCommand): Promise<string> {
    const plaintextBuffer = await this.decrypt(cmd)
    return plaintextBuffer.toString('utf-8')
  }

  /**
   * 列出所有支持的加密算法的元数据
   */
  listCiphers(): CipherMetadata[] {
    return this.ciphers.values()
      .map((cipher): CipherMetadata => ({
        version: cipher.version,
        algorithm: cipher.algorithm,
      }))
      .toArray()
  }
}
