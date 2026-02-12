import { ConfigurableModuleBuilder } from '@nestjs/common'
import { BukaModuleOptions } from './buka-module-options.js'

export const {
  ConfigurableModuleClass: BukaConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: BUKA_MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<BukaModuleOptions>()
  .build()
