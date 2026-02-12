# BlindIndexModule — 盲索引模块

## 概述

`BlindIndexModule` 提供盲索引（Blind Index）能力，用于对敏感数据生成不可逆的哈希值，以便在加密存储场景下仍可进行等值查询，而无需暴露原始明文。

典型场景：用户邮箱已通过信封加密存储，无法直接查询。此时可对邮箱生成盲索引，将索引值存入数据库，查询时对输入邮箱计算同样的盲索引进行匹配。

```typescript
import { BlindIndexModule, BlindIndexService, BlindIndex } from '@buka/nestjs-kit'
```

## 模块配置

`BlindIndexModule` 无需任何配置，直接导入即可：

```typescript
import { Module } from '@nestjs/common'
import { BlindIndexModule } from '@buka/nestjs-kit'

@Module({
  imports: [BlindIndexModule],
})
export class AppModule {}
```

## BlindIndexService

### generate

对数据生成盲索引，始终使用最新版本的哈希算法。

```typescript
import { Injectable } from '@nestjs/common'
import { BlindIndexService, BlindIndex } from '@buka/nestjs-kit'

@Injectable()
export class UserService {
  constructor(private readonly blindIndexService: BlindIndexService) {}

  async createUser(email: string) {
    const index: BlindIndex = await this.blindIndexService.generate(email)
    // index.value   → SHA-256 哈希值（64 字符 hex 字符串）
    // index.version → 1
  }

  async findByEmail(email: string) {
    const index = await this.blindIndexService.generate(email)
    return this.userRepo.findOne({ emailIndex: { value: index.value } })
  }
}
```

**方法签名**

```typescript
async generate(data: JsonValue): Promise<BlindIndex>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | `JsonValue` | 待哈希的 JSON 数据（`string`、`number`、`boolean`、`object`、`array`） |

> `data` 不能为 `null` 或 `undefined`，否则抛出 `TypeError`。

## BlindIndex 可嵌入实体

MikroORM 嵌入式实体，用于在数据库中存储盲索引。所有字段标记为 `hidden`，不会被序列化到 API 响应。

| 字段 | 类型 | 说明 |
|------|------|------|
| `value` | `char(64)` | 哈希值 |
| `version` | `smallint` | 哈希算法版本号 |

### 在实体中使用

```typescript
import { Entity } from '@mikro-orm/core'
import { DiscreteEntity, Column } from '@buka/nestjs-kit/mikro-orm'
import { BlindIndex } from '@buka/nestjs-kit'

@Entity()
export class UserEntity extends DiscreteEntity {
  @Column.Embedded(() => BlindIndex)
  emailIndex!: BlindIndex
}
```

## V1 实现

- **算法**：SHA-256
- **输入处理**：使用 stable JSON 序列化（`stableStringify`）确保相同数据始终生成相同的哈希值，不受对象属性顺序影响
- **输出**：64 字符的 hex 字符串

```
输入: "user@example.com"
  → stableStringify → '"user@example.com"'
  → SHA-256         → "a1b2c3d4..."（64 字符 hex）
```

## 注意事项

> 盲索引是确定性的：相同的输入始终产生相同的哈希值。这是等值查询的基础，但也意味着攻击者可以通过构建彩虹表来反向查找。对于高敏感数据，建议配合信封加密使用。

> 对象类型的数据会先通过 stable JSON 序列化，确保 `{ a: 1, b: 2 }` 和 `{ b: 2, a: 1 }` 生成相同的索引。

> `version` 字段用于支持算法升级。当引入新版本哈希算法时，旧数据的索引仍保持有效，新数据使用新算法。
