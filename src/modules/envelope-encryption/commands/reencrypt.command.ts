import { DecryptCommand } from './decrypt.command'


export interface ReencryptCommand extends DecryptCommand {
  /**
   * 用于加密数据密钥的新 KEK ID
   */
  keyId: string
}
