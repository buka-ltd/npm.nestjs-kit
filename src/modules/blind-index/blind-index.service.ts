import { Injectable, Logger } from '@nestjs/common'
import { BlindIndex } from './entities/blind-index.embeddable'
import { BlindIndexHasher } from './types/blind-index-hasher'
import { BlindIndexV1Hasher } from './blind-index-v1.hasher'
import { JsonValue } from 'type-fest'


@Injectable()
export class BlindIndexService {
  private readonly logger = new Logger(BlindIndexService.name)

  private readonly hashers = new Map<number, BlindIndexHasher>()
  private readonly defaultHasher: BlindIndexHasher

  constructor(
    private readonly hasherV1: BlindIndexV1Hasher,
  ) {
    this.hashers.set(this.hasherV1.version, this.hasherV1)
    this.defaultHasher = this.hasherV1
  }

  /**
   * 对数据生成盲索引
   *
   * @param data - 待哈希的 JSON 数据
   * @returns 包含 value 和 version 的 {@link BlindIndex} 对象
   */
  async generate(data: JsonValue): Promise<BlindIndex> {
    return this.defaultHasher.generate(data)
  }
}
