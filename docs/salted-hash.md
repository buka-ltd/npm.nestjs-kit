# SaltedHashModule — 加盐哈希模块

## 概述

`SaltedHashModule` 提供加盐哈希能力，适用于密码存储等需要不可逆且抗彩虹表攻击的场景。内部通过版本化的 Hasher 实现算法调度，`hash()` 始终使用最新版本算法，`verify()` 根据 `saltedHash.version` 自动选择对应版本算法，确保历史数据可正确验证。

```typescript
import { SaltedHashModule, SaltedHashService, SaltedHash } from '@buka/nestjs-kit'
```

## 模块配置

`SaltedHashModule` 无需任何配置，直接导入即可：

```typescript
import { Module } from '@nestjs/common'
import { SaltedHashModule } from '@buka/nestjs-kit'

@Module({
  imports: [SaltedHashModule],
})
export class AppModule {}
```

## SaltedHashService

### hash

对明文字符串生成加盐哈希。

```typescript
async hash(plain: string): Promise<SaltedHash>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `plain` | `string` | 待哈希的明文字符串（如密码） |

```typescript
const saltedHash: SaltedHash = await saltedHashService.hash('my-password')
// saltedHash.hash    → bcrypt 哈希字符串
// saltedHash.version → 1
```

### verify

验证明文是否与已有的加盐哈希匹配。会根据 `saltedHash.version` 自动选择对应版本的哈希算法，因此即使默认版本已升级，历史数据仍可正确验证。

```typescript
async verify(plain: string, saltedHash: SaltedHash): Promise<boolean>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `plain` | `string` | 待验证的明文字符串 |
| `saltedHash` | `SaltedHash` | 之前生成的哈希对象 |

```typescript
const isValid = await saltedHashService.verify('my-password', savedHash)
if (!isValid) {
  throw new UnauthorizedException()
}
```

> 如果 `saltedHash.version` 对应的算法未注册，会抛出 `TypeError`。

## SaltedHash 可嵌入实体

MikroORM 嵌入式实体，用于在数据库中存储加盐哈希结果。所有字段标记为 `hidden`，不会被序列化到 API 响应。

| 字段 | 类型 | 说明 |
|------|------|------|
| `hash` | `varchar(255)` | 哈希字符串 |
| `version` | `smallint` | 哈希算法版本号 |

### 在实体中使用

```typescript
import { Entity } from '@mikro-orm/core'
import { DiscreteEntity, Column } from '@buka/nestjs-kit/mikro-orm'
import { SaltedHash } from '@buka/nestjs-kit'

@Entity()
export class UserEntity extends DiscreteEntity {
  @Column.Varchar({ length: 64 })
  username!: string

  @Column.Embedded(() => SaltedHash)
  password!: SaltedHash
}
```

## V1 实现

- **算法**：bcrypt
- **Cost Factor**：10 rounds
- **库**：`bcryptjs`

bcrypt 会自动生成随机盐并将其嵌入到哈希字符串中，因此不需要单独存储盐值。

## 完整使用示例

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { SaltedHashService, SaltedHash } from '@buka/nestjs-kit'

@Injectable()
export class AuthService {
  constructor(private readonly saltedHashService: SaltedHashService) {}

  async register(password: string): Promise<SaltedHash> {
    return this.saltedHashService.hash(password)
  }

  async login(password: string, savedHash: SaltedHash): Promise<void> {
    const isValid = await this.saltedHashService.verify(password, savedHash)
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials')
    }
  }
}
```

## 注意事项

> 版本感知校验：`verify()` 根据传入的 `saltedHash.version` 选择对应版本的 Hasher。当未来引入 V2 算法时，旧数据（`version: 1`）仍使用 bcrypt 验证，新数据自动使用 V2 算法。

> bcrypt 的 10 rounds 在现代硬件上大约需要 100ms，既保证了安全性又不会过多影响性能。如有特殊需求，可通过引入新版本的 Hasher 调整。

> `SaltedHash` 实体的 `hash` 字段长度为 255，足以容纳 bcrypt 和未来可能的算法输出。
