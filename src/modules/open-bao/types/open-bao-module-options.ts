import type { OpenBaoAuthMethod } from './open-bao-auth.types.js'

export interface OpenBaoModuleOptions {
  /**
   * OpenBao 服务器地址
   */
  address: string

  /**
   * 身份认证配置
   */
  auth: OpenBaoAuthMethod

  /**
   * Transit 引擎挂载路径，默认 'transit'
   */
  transitMount?: string

  /**
   * Token 续期提前量（秒），在 Token 过期前多少秒触发续期，默认 30
   */
  renewBufferSeconds?: number
}
