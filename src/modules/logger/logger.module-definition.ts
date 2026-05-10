import { ConfigurableModuleBuilder } from '@nestjs/common'
import { LoggerModuleOptions } from './types/logger-module-options'

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN }
  = new ConfigurableModuleBuilder<LoggerModuleOptions>().build()
