import { ConfigurableModuleBuilder } from '@nestjs/common'
import { ObjectStorageModuleOptions } from './types/index.js'

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<ObjectStorageModuleOptions>()
  .build()
