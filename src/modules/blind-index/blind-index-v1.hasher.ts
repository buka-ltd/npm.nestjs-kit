import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { BlindIndex } from './entities/blind-index.embeddable'
import { BlindIndexHasher } from './types/blind-index-hasher'
import { JsonValue } from 'type-fest'
import { stableStringify } from '~/utils/stable-stringify'


/**
 * 盲索引 V1 实现
 *
 * 使用 SHA-256 对 JSON 稳定序列化后的字符串计算哈希
 */
@Injectable()
export class BlindIndexV1Hasher implements BlindIndexHasher {
  version = <const>1

  async generate(data: JsonValue): Promise<BlindIndex> {
    if (data === null || data === undefined) {
      throw new TypeError('Cannot hash null or undefined data')
    }

    const jsonString = stableStringify(data)
    const value = createHash('sha256').update(jsonString, 'utf8')
      .digest('hex')

    return {
      value,
      version: 1,
    }
  }
}
