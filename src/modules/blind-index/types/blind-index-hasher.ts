import { BlindIndex } from '../entities/blind-index.embeddable'
import { JsonValue } from 'type-fest'


/**
 * 盲索引算法抽象接口
 *
 * 每个版本的盲索引算法实现该接口，由 `BlindIndexService` 统一调度。
 * 通过 `version` 字段区分不同算法，支持平滑升级。
 */
export interface BlindIndexHasher {
  /**
   * 算法版本号
   */
  version: number

  /**
   * 对数据生成盲索引
   *
   * @param data - 待哈希的 JSON 数据
   * @returns 包含 value 和 version 的 {@link BlindIndex} 对象
   */
  generate(data: JsonValue): Promise<BlindIndex>
}
