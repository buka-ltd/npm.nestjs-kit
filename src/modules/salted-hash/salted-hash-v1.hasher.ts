import { Injectable } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { SaltedHash } from './entities/salted-hash.embeddable'
import { SaltedHashHasher } from './types/salted-hash-hasher'


const BCRYPT_ROUNDS = 10


/**
 * 加盐哈希 V1 实现
 *
 * 使用 bcrypt 算法，cost factor 为 10
 */
@Injectable()
export class SaltedHashV1Hasher implements SaltedHashHasher {
  version = <const>1

  async hash(plain: string): Promise<SaltedHash> {
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS)

    return {
      hash,
      version: 1,
    }
  }

  async verify(plain: string, saltedHash: SaltedHash): Promise<boolean> {
    return bcrypt.compare(plain, saltedHash.hash)
  }
}
