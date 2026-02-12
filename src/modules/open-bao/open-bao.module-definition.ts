import { ConfigurableModuleBuilder } from '@nestjs/common'
import { OpenBaoModuleOptions } from './types/index.js'

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<OpenBaoModuleOptions>()
  .build()
