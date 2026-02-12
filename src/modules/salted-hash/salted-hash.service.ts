import { Injectable, Logger } from '@nestjs/common'
import { SaltedHash } from './entities/salted-hash.embeddable'
import { SaltedHashHasher } from './types/salted-hash-hasher'
import { SaltedHashV1Hasher } from './salted-hash-v1.hasher'


@Injectable()
export class SaltedHashService {
  private readonly logger = new Logger(SaltedHashService.name)

  private readonly hashers = new Map<number, SaltedHashHasher>()
  private readonly defaultHasher: SaltedHashHasher

  constructor(
    private readonly hasherV1: SaltedHashV1Hasher,
  ) {
    this.hashers.set(this.hasherV1.version, this.hasherV1)
    this.defaultHasher = this.hasherV1
  }

  /**
   * 对明文数据生成加盐哈希
   *
   * @param plain - 待哈希的明文字符串（如密码）
   * @returns 包含 hash、version 的 {@link SaltedHash} 对象
   */
  async hash(plain: string): Promise<SaltedHash> {
    return this.defaultHasher.hash(plain)
  }

  /**
   * 验证明文是否与已有的加盐哈希匹配
   *
   * 会根据 `saltedHash.version` 自动选择对应版本的哈希算法进行验证，
   * 因此即使默认版本已升级，历史数据仍可正确验证。
   *
   * @param plain - 待验证的明文字符串
   * @param saltedHash - 之前生成的 {@link SaltedHash} 对象
   * @returns 匹配返回 `true`，否则返回 `false`
   */
  async verify(plain: string, saltedHash: SaltedHash): Promise<boolean> {
    const hasher = this.hashers.get(saltedHash.version)

    if (!hasher) {
      throw new TypeError(`Unsupported salted hash version: ${saltedHash.version}`)
    }

    return hasher.verify(plain, saltedHash)
  }
}
