import { ConfigurableModuleBuilder } from '@nestjs/common'
import { EnvelopeEncryptionModuleOptions } from './types/envelope-encryption-module-options'

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<EnvelopeEncryptionModuleOptions>()
  .build()
