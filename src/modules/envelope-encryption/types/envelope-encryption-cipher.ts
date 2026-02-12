import { KeyEnvelope } from '../entities/key-envelope.embeddable'
import { EncryptedPayload } from '../entities/encrypted-payload.embeddable'
import { CipherEncryptCommand, CipherDecryptCommand } from '../commands'


/**
 * 信封加密服务抽象类
 *
 * 信封加密（Envelope Encryption）是一种两层加密策略：
 * 1. 使用数据加密密钥（DEK）加密实际数据
 * 2. 使用密钥加密密钥（KEK）加密 DEK
 *
 * KEK 由 OpenBao Transit 引擎管理，永远不会离开 OpenBao
 *
 * AAD 绑定：每个加密数据都会生成唯一的 kekId，kekId 会被写入 AAD，
 * 确保密文与 kekId 绑定，防止密文被替换攻击
 */
export interface EnvelopeEncryptionCipher {

  /**
   * 算法版本号
   */
  version: number

  /**
   * 算法名称
   */
  algorithm: string

  /**
   * 使用信封加密方式加密数据
   *
   * @returns [KeyEnvelope, EncryptedPayload] 密钥信封和加密数据实体
   */
  encrypt(cmd: CipherEncryptCommand): Promise<[KeyEnvelope, EncryptedPayload]>

  /**
   * 解密信封加密的数据
   *
   * @returns 解密后的明文
   */
  decrypt(cmd: CipherDecryptCommand): Promise<Buffer>

  // /**
  //  * 解密为字符串
  //  *
  //  * @param envelope 密钥信封实体
  //  * @param payload 加密数据实体
  //  * @param extraAad 额外的附加认证数据
  //  * @returns 解密后的字符串
  //  */
  // decryptToString(envelope: KeyEnvelope, payload: EncryptedPayload, extraAad?: Buffer): Promise<string>

  // /**
  //  * 重新加密数据（使用最新版本的 KEK 和算法）
  //  * 用于 KEK 轮换后更新旧数据
  //  *
  //  * @returns 使用新 KEK 加密的结果
  //  */
  // reencrypt(envelope: KeyEnvelope, payload: EncryptedPayload, extraAad?: Buffer): Promise<[KeyEnvelope, EncryptedPayload]>

  // /**
  //  * 检查是否需要重新加密
  //  *
  //  * @param envelope KeyEnvelope 实体
  //  * @param currentKekVersion 当前 KEK 版本
  //  * @returns 是否需要重新加密
  //  */
  // needsReencryption(envelope: KeyEnvelope, currentKekVersion: number): boolean

  // /**
  //  * 根据密码版本号获取算法名称
  //  *
  //  * @param cipherVersion 密码版本号
  //  * @returns 算法名称
  //  */
  // getAlgorithm(cipherVersion: number): CipherGCMTypes

  // /**
  //  * 获取当前默认密码版本
  //  */
  // getCurrentCipherVersion(): number
}
