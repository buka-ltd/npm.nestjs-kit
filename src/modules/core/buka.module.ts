import { Module, Global } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { MikroORM, EntityManager } from '@mikro-orm/core'
import { BukaModuleOptions } from './buka-module-options.js'
import { BukaValidationPipe } from './pipes/validation.pipe.js'
import { BukaConfigurableModuleClass, BUKA_MODULE_OPTIONS_TOKEN } from './buka.module-definition.js'


@Global()
@Module({
  providers: [
    {
      provide: APP_PIPE,
      inject: [BUKA_MODULE_OPTIONS_TOKEN, MikroORM, EntityManager],
      useFactory: (options: BukaModuleOptions, orm: MikroORM, em: EntityManager) => {
        return new BukaValidationPipe(orm, em, options?.validation)
      },
    },
  ],
})
export class BukaModule extends BukaConfigurableModuleClass {}
