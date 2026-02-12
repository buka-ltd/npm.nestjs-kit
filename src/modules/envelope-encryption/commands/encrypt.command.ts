import { CipherEncryptCommand } from './cipher-encrypt.command'

export interface EncryptStringCommand extends Pick<CipherEncryptCommand, 'kekId' | 'extraAad'> {
  /**
   * 明文字符串数据
   */
  plaintext: string

  /**
   * 字符编码
   *
   * @default 'utf8'
   */
  encoding?: BufferEncoding
}

export interface EncryptBufferCommand extends Pick<CipherEncryptCommand, 'kekId' | 'extraAad'> {
  /**
   * 明文二进制数据
   */
  plaintext: Buffer
}

export type EncryptCommand = EncryptStringCommand | EncryptBufferCommand
