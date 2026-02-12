# OpenBaoModule — OpenBao/Vault 集成模块

## 概述

`OpenBaoModule` 提供 OpenBao（HashiCorp Vault 兼容）客户端集成，负责身份认证、Token 生命周期管理以及 HTTP 客户端注入。模块支持 4 种认证方式，并自动续期 Token。

```typescript
import { OpenBaoModule, OpenBaoTokenManager } from '@buka/nestjs-kit'
import { OpenBaoHttpClient } from '@buka/nestjs-kit'
```

## 模块配置

使用 NestJS `ConfigurableModuleBuilder` 模式注册：

```typescript
OpenBaoModule.register({
  address: 'http://localhost:8200',
  auth: { method: 'token', token: 's.xxxxx' },
})
```

### 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `address` | `string` | 是 | — | OpenBao 服务器地址 |
| `auth` | `OpenBaoAuthMethod` | 是 | — | 身份认证配置（见下方） |
| `transitMount` | `string` | 否 | `'transit'` | Transit 引擎挂载路径 |
| `renewBufferSeconds` | `number` | 否 | `30` | Token 续期提前量（秒），在过期前多少秒触发续期 |

## 认证方式

### Token 认证

直接使用已有的 OpenBao Token：

```typescript
OpenBaoModule.register({
  address: 'http://localhost:8200',
  auth: {
    method: 'token',
    token: 's.xxxxx',
  },
})
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `method` | `'token'` | 是 | 认证方式标识 |
| `token` | `string` | 是 | OpenBao 认证令牌 |

### Userpass 认证

使用用户名密码登录：

```typescript
OpenBaoModule.register({
  address: 'http://localhost:8200',
  auth: {
    method: 'userpass',
    username: 'admin',
    password: 'secret',
  },
})
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `method` | `'userpass'` | 是 | — | 认证方式标识 |
| `username` | `string` | 是 | — | 用户名 |
| `password` | `string` | 是 | — | 密码 |
| `mount` | `string` | 否 | `'userpass'` | 认证引擎挂载路径 |

### AppRole 认证

使用 AppRole 的 Role ID 和 Secret ID 登录：

```typescript
OpenBaoModule.register({
  address: 'http://localhost:8200',
  auth: {
    method: 'approle',
    roleId: 'xxx',
    secretId: 'yyy',
  },
})
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `method` | `'approle'` | 是 | — | 认证方式标识 |
| `roleId` | `string` | 是 | — | AppRole 的 Role ID |
| `secretId` | `string` | 是 | — | AppRole 的 Secret ID |
| `mount` | `string` | 否 | `'approle'` | 认证引擎挂载路径 |

### Kubernetes 认证

使用 Kubernetes ServiceAccount 登录：

```typescript
OpenBaoModule.register({
  address: 'http://localhost:8200',
  auth: {
    method: 'kubernetes',
    role: 'my-role',
  },
})
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `method` | `'kubernetes'` | 是 | — | 认证方式标识 |
| `role` | `string` | 是 | — | Kubernetes 角色名称 |
| `jwt` | `string` | 否 | — | JWT 令牌，如不提供则从 `tokenPath` 读取 |
| `tokenPath` | `string` | 否 | `/var/run/secrets/kubernetes.io/serviceaccount/token` | ServiceAccount Token 文件路径 |
| `mount` | `string` | 否 | `'kubernetes'` | 认证引擎挂载路径 |

## OpenBaoTokenManager

Token 生命周期管理服务，负责认证、续期和失败重试。

### 核心行为

1. **模块初始化时**（`onModuleInit`）：执行认证，获取初始 Token
2. **调度续期**：在 Token 过期前 `renewBufferSeconds` 秒触发续期（最少 1 秒）
3. **续期失败处理**：自动尝试重新认证；若重新认证也失败，5 秒后重试
4. **模块销毁时**（`onModuleDestroy`）：清除续期定时器

### 方法

| 方法 | 说明 |
|------|------|
| `getToken(): string` | 获取当前有效的 Token。Token 不可用时抛出异常 |

> Token 认证方式会通过 `lookup-self` API 查询 Token 的 TTL 和是否可续期。如果查询失败，则假定为不可续期的静态 Token。

## OpenBaoHttpClient

已配置认证的 HTTP 客户端，基于 `keq` 构建。内部自动：

- 设置 `baseUrl` 为 `{address}/v1/`
- 对非认证端点自动附加 `X-Vault-Token` 请求头
- 校验 HTTP 状态码

注入使用：

```typescript
import { Injectable } from '@nestjs/common'
import { OpenBaoHttpClient } from '@buka/nestjs-kit'

@Injectable()
export class MyService {
  constructor(private readonly openbao: OpenBaoHttpClient) {}

  async readSecret(path: string) {
    return this.openbao.kvRead({ path })
  }
}
```

## 注意事项

> 模块使用 `@Global()` 装饰器，导入一次后 `OpenBaoTokenManager` 和 `OpenBaoHttpClient` 即可在全局注入。

> 续期定时器使用 `timer.unref()`，不会阻止 Node.js 进程正常退出。

> 以下端点不会附加 `X-Vault-Token`：`/auth/*/login*`、`/sys/health`、`/sys/init`、`/sys/seal-status`、`/sys/unseal`、`/sys/leader`、`/sys/generate-root/*`、`/sys/rekey/*`。
