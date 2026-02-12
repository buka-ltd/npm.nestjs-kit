import { Global, Module } from '@nestjs/common'
import { ObjectStorageService } from './object-storage.service'
import { ConfigurableModuleClass } from './object-storage.module-definition'

@Global()
@Module({
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class ObjectStorageModule extends ConfigurableModuleClass {}
