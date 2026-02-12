export interface CipherEncryptCommand {
  /**
   * 用于加密数据密钥的 KEK ID
   */
  kekId: string

  /**
   * 明文二进制数据
   */
  plaintext: Buffer

  /**
   * 额外的附加认证数据（可选，会与 kekId 合并）
   */
  extraAad?: Record<string, any>
}
