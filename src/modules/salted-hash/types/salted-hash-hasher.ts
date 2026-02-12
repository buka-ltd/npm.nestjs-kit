import { SaltedHash } from '../entities/salted-hash.embeddable'


/**
 * 加盐哈希算法抽象接口
 *
 * 每个版本的哈希算法实现该接口，由 `SaltedHashService` 统一调度。
 * 通过 `version` 字段区分不同算法，支持平滑升级。
 */
export interface SaltedHashHasher {
  /**
   * 算法版本号
   */
  version: number

  /**
   * 对明文生成加盐哈希
   *
   * @param plain - 待哈希的明文字符串
   * @returns 包含 hash 和 version 的 {@link SaltedHash} 对象
   */
  hash(plain: string): Promise<SaltedHash>

  /**
   * 验证明文是否与已有的加盐哈希匹配
   *
   * @param plain - 待验证的明文字符串
   * @param saltedHash - 之前生成的 {@link SaltedHash} 对象
   * @returns 匹配返回 `true`，否则返回 `false`
   */
  verify(plain: string, saltedHash: SaltedHash): Promise<boolean>
}
