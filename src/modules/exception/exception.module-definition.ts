import { ConfigurableModuleBuilder } from '@nestjs/common'

export interface ExceptionModuleOptions {
  /**
   * 系统ID (0 - 1048575)
   * 全公司唯一，用于区分不同业务系统
   */
  systemId: number | string
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<ExceptionModuleOptions>()
  .build()
