import { EncryptedPayload } from '../entities/encrypted-payload.embeddable'
import { KeyEnvelope } from '../entities/key-envelope.embeddable'


export interface CipherDecryptCommand {
  /**
   * 密钥信封实体
   */
  envelope: KeyEnvelope

  /**
   * 加密数据实体
   */
  payload: EncryptedPayload

  /**
   * 额外的附加认证数据（必须与加密时使用的相同）
   */
  extraAad?: Record<string, any>
}
