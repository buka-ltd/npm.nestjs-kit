# EnvelopeEncryptionModule — 信封加密模块

## 概述

`EnvelopeEncryptionModule` 实现了信封加密（Envelope Encryption）策略，采用 KEK/DEK 两层加密架构：

1. **DEK（Data Encryption Key）**：数据加密密钥，用于加密实际数据，每次加密生成新的 DEK
2. **KEK（Key Encryption Key）**：密钥加密密钥，由 OpenBao Transit 引擎管理，用于加密 DEK，永远不会离开 OpenBao

这种架构确保了即使数据库被泄露，攻击者也无法解密数据，因为 DEK 本身是加密的，而解密 DEK 需要 KEK（由 OpenBao 管理）。

```typescript
import {
  EnvelopeEncryptionModule,
  EnvelopeEncryptionService,
  KeyEnvelope,
  EncryptedPayload,
} from '@buka/nestjs-kit'
```

## 模块配置

> `EnvelopeEncryptionModule` 依赖 `OpenBaoModule`，必须先注册 `OpenBaoModule`。

```typescript
import { Module } from '@nestjs/common'
import { OpenBaoModule, EnvelopeEncryptionModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    OpenBaoModule.register({
      address: 'http://localhost:8200',
      auth: { method: 'token', token: 's.xxxxx' },
    }),
    EnvelopeEncryptionModule.register({
      version: 1,
    }),
  ],
})
export class AppModule {}
```

### 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `version` | `1` | 否 | `1` | 默认加密算法版本 |

## EnvelopeEncryptionService

核心加密服务，提供 `encrypt`、`decrypt`、`decryptToString` 和 `reencrypt` 方法。

### encrypt

加密数据，返回密钥信封和加密载荷。支持字符串和 Buffer 两种输入。

```typescript
// 加密字符串
const [envelope, payload] = await encryptionService.encrypt({
  kekId: 'user-secrets',
  plaintext: '敏感数据',
  encoding: 'utf8',        // 可选，默认 'utf8'
  extraAad: { userId: '123' }, // 可选，额外的 AAD
})

// 加密 Buffer
const [envelope, payload] = await encryptionService.encrypt({
  kekId: 'user-secrets',
  plaintext: Buffer.from([0x01, 0x02, 0x03]),
  extraAad: { userId: '123' },
})
```

### decrypt

解密数据，返回 `Buffer`。

```typescript
const plaintext: Buffer = await encryptionService.decrypt({
  envelope,
  payload,
  extraAad: { userId: '123' }, // 必须与加密时一致
})
```

### decryptToString

解密为 UTF-8 字符串。

```typescript
const text: string = await encryptionService.decryptToString({
  envelope,
  payload,
  extraAad: { userId: '123' },
})
```

### reencrypt

使用新的 KEK 重新加密数据，用于密钥轮换场景。

```typescript
const [newEnvelope, newPayload] = await encryptionService.reencrypt({
  envelope,
  payload,
  keyId: 'new-kek-id',
  extraAad: { userId: '123' },
})
```

## Command 对象

### EncryptCommand

`EncryptCommand` 为 `EncryptStringCommand | EncryptBufferCommand` 的联合类型：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kekId` | `string` | 是 | KEK 标识符 |
| `plaintext` | `string \| Buffer` | 是 | 明文数据 |
| `encoding` | `BufferEncoding` | 否 | 字符编码（仅字符串模式），默认 `'utf8'` |
| `extraAad` | `Record<string, unknown>` | 否 | 额外的附加认证数据 |

### DecryptCommand

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `envelope` | `KeyEnvelope` | 是 | 密钥信封实体 |
| `payload` | `EncryptedPayload` | 是 | 加密数据实体 |
| `extraAad` | `Record<string, unknown>` | 否 | 额外的附加认证数据（必须与加密时一致） |

### ReencryptCommand

继承 `DecryptCommand` 的所有字段，额外增加：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyId` | `string` | 是 | 新的 KEK ID |

## 可嵌入实体

### KeyEnvelope

密钥信封的 MikroORM 嵌入式实体，包含 KEK 相关元数据。所有字段标记为 `hidden`，不会被序列化到 API 响应。

| 字段 | 类型 | 说明 |
|------|------|------|
| `kekId` | `varchar(64)` | KEK 标识符，用于 AAD 绑定 |
| `kekVersion` | `smallint` | KEK 版本号，用于密钥轮换追踪 |
| `dek` | `bytea` | 加密的 DEK（由 KEK 加密） |

### EncryptedPayload

加密数据的 MikroORM 嵌入式实体。所有字段标记为 `hidden`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `ciphertext` | `bytea` | 加密后的数据 |
| `cipherIv` | `bytea` | 初始化向量 |
| `cipherTag` | `bytea` | GCM 认证标签 |
| `cipherVersion` | `smallint` | 加密算法版本号，默认 `1` |

### 在实体中使用

```typescript
import { Entity } from '@mikro-orm/core'
import { DiscreteEntity, Column } from '@buka/nestjs-kit/mikro-orm'
import { KeyEnvelope, EncryptedPayload } from '@buka/nestjs-kit'

@Entity()
export class UserSecretEntity extends DiscreteEntity {
  @Column.Embedded(() => KeyEnvelope)
  envelope!: KeyEnvelope

  @Column.Embedded(() => EncryptedPayload)
  payload!: EncryptedPayload
}
```

## 加密细节

### V1 实现：AES-256-GCM

- **算法**：`aes-256-gcm`
- **DEK 生成**：通过 OpenBao Transit 引擎的 `datakey` API 生成 256 位密钥
- **IV**：12 字节随机数（`crypto.randomBytes(12)`）
- **认证标签**：16 字节
- **AAD 绑定**：将 `kekId` 和 `extraAad` 通过 stable JSON 序列化后编码到 AAD 中，确保密文与 kekId 绑定，防止密文替换攻击
- **内存安全**：加密/解密完成后立即清零内存中的 DEK（`dek.fill(0)`）

## 注意事项

> `extraAad` 在加密和解密时必须完全一致，否则 GCM 认证将失败并抛出异常。可以利用此特性将密文绑定到特定的业务上下文（如用户 ID）。

> KEK 永远不会离开 OpenBao，所有 DEK 的加密/解密操作均通过 OpenBao Transit API 完成。

> 解密时会根据 `EncryptedPayload.cipherVersion` 自动选择对应版本的 Cipher 实现，确保向后兼容。
