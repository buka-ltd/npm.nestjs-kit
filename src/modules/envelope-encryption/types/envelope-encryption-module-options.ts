export interface EnvelopeEncryptionModuleOptions {
  /**
   * @default 1
   */
  version?: 1

  /**
   * 模块初始化时预加载的 KEK ID 列表，每个 ID 须与 OpenBao Transit key 名称对应。
   * 列表中的 KEK 会在启动时验证（快速失败）。
   * 未列出的 KEK 将在首次使用时懒加载。
   */
  keks?: string[]

  /**
   * 内存中 DEK 缓存的 TTL，单位为秒。
   * 设置为正数时，解密后的 DEK 明文将在内存中缓存指定时长，
   * 避免对同一加密 DEK 重复调用 OpenBao Transit 解密接口。
   * 设置为 0（默认）则禁用缓存。
   * @default 0
   */
  dekCacheTtl?: number
}
