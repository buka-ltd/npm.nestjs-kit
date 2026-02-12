import { Global, Module } from '@nestjs/common'
import { BlindIndexService } from './blind-index.service'
import { BlindIndexV1Hasher } from './blind-index-v1.hasher'


/**
 * BlindIndexModule 提供盲索引(Blind Index)能力，用于对敏感数据生成不可逆的哈希值，
 * 以便在加密存储场景下仍可进行等值查询，而无需暴露原始明文。
 *
 * 该模块为全局模块，导入一次后即可在任意位置注入 `BlindIndexService`。
 * 内部通过版本化的 Hasher Provider 实现算法调度，`generate()` 始终使用最新版本算法。
 *
 * @example
 * // 1. 在 AppModule 中导入
 * import { BlindIndexModule } from '@buka/nestjs-kit'
 *
 * @Module({
 *   imports: [BlindIndexModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // 2. 在 Service 中注入使用
 * import { BlindIndexService, BlindIndex } from '@buka/nestjs-kit'
 *
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly blindIndexService: BlindIndexService) {}
 *
 *   async createUser(email: string) {
 *     // 生成盲索引，可存入数据库用于后续查询
 *     const blindIndex: BlindIndex = await this.blindIndexService.generate(email)
 *     // blindIndex.value   -> 哈希值
 *     // blindIndex.version -> 哈希算法版本号
 *   }
 * }
 *
 * @example
 * // 3. 在 MikroORM Entity 中使用 BlindIndex 嵌入类型
 * import { Entity, Embedded } from '@mikro-orm/core'
 * import { BlindIndex } from '@buka/nestjs-kit'
 *
 * @Entity()
 * export class User {
 *   @Embedded(() => BlindIndex)
 *   emailIndex!: BlindIndex
 * }
 */
@Global()
@Module({
  providers: [
    BlindIndexService,
    BlindIndexV1Hasher,
  ],
  exports: [BlindIndexService],
})
export class BlindIndexModule {}
