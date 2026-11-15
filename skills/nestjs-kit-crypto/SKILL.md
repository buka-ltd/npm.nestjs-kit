---
name: nestjs-kit-crypto
description: >
  在 NestJS 代码里加密存储敏感字段、给加密字段建等值查询、存密码或凭证、执行密钥轮换时加载本 skill。覆盖 EnvelopeEncryptionModule(信封加密、KeyEnvelope/EncryptedPayload)、BlindIndexModule(盲索引)、SaltedHashModule(加盐哈希)、实体中嵌入加密列(Column.Embedded)与 reencrypt。
---

# 加密三件套(信封加密 / 盲索引 / 加盐哈希)

三个模块互相独立;**信封加密依赖 OpenBaoModule**(前置条件:项目已注册 OpenBaoModule,其内部通过 transit 生成/加解密 DEK,见 [nestjs-kit-open-bao](../nestjs-kit-open-bao/SKILL.md))。

## 选型对照

| 场景 | 用什么 | 说明 |
|---|---|---|
| 密码/凭证存储,只需校验不需还原 | `SaltedHash`(bcrypt) | 抗彩虹表 |
| 敏感字段需要**等值查询**(邮箱/手机号) | `BlindIndex`(SHA-256 确定性哈希) | 不能还原;有彩虹表风险,**配合信封加密存明文** |
| 字段级机密需要**还原明文** | `EnvelopeEncryption`(AES-256-GCM,KEK/DEK) | KEK 托管于 OpenBao Transit |
| 加密字段 + 等值查询的组合 | `EncryptedPayload` + `BlindIndex` 同表存 | 查索引、解密取明文 |

各可嵌入实体字段默认 `hidden`,不会被序列化进 API 响应。

## 加盐哈希(SaltedHashModule)

```typescript
import { SaltedHashService, SaltedHash, DiscreteEntity, Column } from '@buka/nestjs-kit'

@Module({ imports: [SaltedHashModule] })
export class AppModule {}

@Entity()
export class UserEntity extends DiscreteEntity {
  @Column.Embedded(() => SaltedHash)
  password!: SaltedHash
}

// service
const saltedHash = await this.saltedHashService.hash('my-password')
// saltedHash.hash → bcrypt 字符串;saltedHash.version → 1
const ok = await this.saltedHashService.verify('my-password', savedHash)
```

- V1:bcrypt,cost 10(约 100ms),盐内嵌于哈希串,无需单独存盐
- `verify` 按 `version` 路由 hasher,历史数据在算法升级后仍可验证

## 盲索引(BlindIndexModule)

```typescript
import { BlindIndexService, BlindIndex } from '@buka/nestjs-kit'

@Entity()
export class UserEntity extends DiscreteEntity {
  @Column.Embedded(() => BlindIndex)
  emailIndex!: BlindIndex
}

// 写:入库前生成索引
const index = await this.blindIndexService.generate(email)
// 查:对输入做同样计算后等值匹配
const idx = await this.blindIndexService.generate(inputEmail)
await this.userRepo.findOne({ emailIndex: { value: idx.value } })
```

- `generate(data: JsonValue)` → `{ value: char(64) hex, version }`;对象输入先 `stableStringify`(键排序)再哈希,属性顺序不影响结果
- `data` 不能为 `null`/`undefined`(抛 TypeError)
- **确定性哈希可被彩虹表反查**:高敏感数据(邮箱等)将明文经信封加密存 `EncryptedPayload`,盲索引仅用于查询定位

## 信封加密(EnvelopeEncryptionModule)

两把钥匙:DEK(每次加密随机生成,加密数据)→ 由 KEK(OpenBao Transit 管理,永不出 OpenBao)加密后随数据存储。数据库泄露时攻击者拿不到 KEK 就无法解密。

```typescript
// 注册(前置条件:模块所在 AppModule 已注册 OpenBaoModule)
@Module({ imports: [EnvelopeEncryptionModule.register({ version: 1 })] })
export class AppModule {}

// 加密(string 或 Buffer)
import { EnvelopeEncryptionService } from '@buka/nestjs-kit'

const [envelope, payload] = await this.encryption.encrypt({
  kekId: 'user-secrets',              // KEK 标识(对应 OpenBao transit key)
  plaintext: '敏感数据',
  extraAad: { userId: '123' },        // 可选:绑定业务上下文
})

// 解密
const buffer = await this.encryption.decrypt({ envelope, payload, extraAad: { userId: '123' } })
const text = await this.encryption.decryptToString({ envelope, payload, extraAad: { userId: '123' } })

// 密钥轮换
const [newEnvelope, newPayload] = await this.encryption.reencrypt({
  envelope, payload, keyId: 'new-kek-id', extraAad: { userId: '123' },
})
```

可嵌入实体:

```typescript
@Entity()
export class UserSecretEntity extends DiscreteEntity {
  @Column.Embedded(() => KeyEnvelope)      // kekId varchar(64) / kekVersion / dek bytea
  envelope!: KeyEnvelope

  @Column.Embedded(() => EncryptedPayload) // ciphertext / cipherIv / cipherTag / cipherVersion smallint
  payload!: EncryptedPayload
}
```

V1 实现:AES-256-GCM;IV 12 字节随机、认证标签 16 字节;AAD 由 `kekId + extraAad` 稳定序列化组成(密文与 KEK/业务上下文绑定,防密文替换);DEK 用后立即内存清零;`cipherVersion` 驱动向后兼容。

## 注意事项

- 密码存储统一走 `SaltedHash`:自实现 `crypto.createHash('sha256')` 无盐,无法抵御彩虹表;SaltedHash 的 bcrypt 自带盐与版本路由
- 加密字段在实体上统一用可嵌入实体(`KeyEnvelope`+`EncryptedPayload` / `BlindIndex` / `SaltedHash`),字段自动 `hidden`,即使手写 DTO 也要确认不暴露
- **`extraAad` 加密与解密必须完全一致**(不一致 GCM 认证失败);用它绑定 owner(如 `{ userId }`),防止把 A 的密文拿到 B 的请求里解
- `reencrypt` 用于 KEK 轮换/迁移,轮换是逐条进行的,安排后台任务批量执行
- 盲索引是可复现的确定性哈希(不可还原),仅供等值查询定位;同一输入恒得同一索引值,存在彩虹表反查风险——敏感语义字段将明文存入信封加密的 `EncryptedPayload`,盲索引仅作查询入口
- `generate`/`hash` 输入先做规范化(邮箱 lowercase/trim)再哈希,否则等值查询对不准

## 相关 skills

- [nestjs-kit-open-bao](../nestjs-kit-open-bao/SKILL.md) — OpenBao 注册(信封加密前置)
- [nestjs-kit-coding-standards](../nestjs-kit-coding-standards/references/entity.md) — `Column.Embedded` 嵌入