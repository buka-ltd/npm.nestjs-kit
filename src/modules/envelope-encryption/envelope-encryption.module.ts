import { DynamicModule, Global, Module } from '@nestjs/common'
import { EnvelopeEncryptionService } from './envelope-encryption.service'
import { ConfigurableModuleClass } from './envelope-encryption.module-definition'
import { EnvelopeEncryptionV1Cipher } from './envelope-encryption-v1.cipher'
import { KmsProvider } from './kms.provider'
import { EnvelopeEncryptionModuleOptions } from './types/envelope-encryption-module-options'


@Global()
@Module({
  imports: [],
  providers: [
    EnvelopeEncryptionService,
    EnvelopeEncryptionV1Cipher,
    KmsProvider,
  ],
  exports: [EnvelopeEncryptionService],
})
export class EnvelopeEncryptionModule extends ConfigurableModuleClass {
  static register(options: EnvelopeEncryptionModuleOptions = {}): DynamicModule {
    return super.register(options)
  }
}
