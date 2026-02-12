import { Global, Module } from '@nestjs/common'
import { SaltedHashService } from './salted-hash.service'
import { SaltedHashV1Hasher } from './salted-hash-v1.hasher'


/**
 * SaltedHashModule 提供加盐哈希能力，适用于密码存储等需要不可逆且抗彩虹表攻击的场景。
 *
 * 该模块为全局模块，导入一次后即可在任意位置注入 `SaltedHashService`。
 * 内部通过版本化的 Hasher Provider 实现算法调度，`hash()` 始终使用最新版本算法，
 * `verify()` 根据 `saltedHash.version` 自动选择对应版本算法，确保历史数据可正确验证。
 *
 * @example
 * // 1. 在 AppModule 中导入
 * import { SaltedHashModule } from '@buka/nestjs-kit'
 *
 * @Module({
 *   imports: [SaltedHashModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // 2. 注册用户时生成密码哈希
 * import { SaltedHashService, SaltedHash } from '@buka/nestjs-kit'
 *
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly saltedHashService: SaltedHashService) {}
 *
 *   async register(password: string) {
 *     const saltedHash: SaltedHash = await this.saltedHashService.hash(password)
 *     // saltedHash.hash    -> 哈希字符串
 *     // saltedHash.version -> 哈希算法版本号
 *     // 将 saltedHash 存入数据库
 *   }
 *
 *   async login(password: string, savedHash: SaltedHash) {
 *     const isValid = await this.saltedHashService.verify(password, savedHash)
 *     if (!isValid) throw new UnauthorizedException()
 *   }
 * }
 *
 * @example
 * // 3. 在 MikroORM Entity 中使用 SaltedHash 嵌入类型
 * import { Entity, Embedded } from '@mikro-orm/core'
 * import { SaltedHash } from '@buka/nestjs-kit'
 *
 * @Entity()
 * export class User {
 *   @Embedded(() => SaltedHash)
 *   password!: SaltedHash
 * }
 */
@Global()
@Module({
  providers: [
    SaltedHashService,
    SaltedHashV1Hasher,
  ],
  exports: [SaltedHashService],
})
export class SaltedHashModule {}
