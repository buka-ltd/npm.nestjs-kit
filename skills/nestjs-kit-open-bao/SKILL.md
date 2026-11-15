---
name: nestjs-kit-open-bao
description: >
  在项目里读写 KV 秘密、配置 OpenBao/Vault 认证、管理 transit 密钥、获取或续期 token 时加载本 skill。覆盖 OpenBaoHttpClient 的 kvReadDataPath/kvWriteDataPath、token/userpass/approle/kubernetes 认证、OpenBaoTokenManager、setOpenBaoToken 给自建 keq 客户端透传 token。
---

# OpenBao / Vault 集成(OpenBaoModule)

OpenBaoModule 为 `@Global()` 模块,注册一次全局注入。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 注册 OpenBao 客户端 | `OpenBaoModule.register({ address, auth })` |
| 读/写 KV 秘密 | 注入 `OpenBaoHttpClient`,`kvReadDataPath` / `kvWriteDataPath` |
| 获取当前 Token | `OpenBaoTokenManager.getToken()` |
| 给自建 keq 客户端透传 token | `setOpenBaoToken(() => tokenManager.getToken())` |
| 环境变量配置 | `OpenBaoConfig`(配合 `@buka/nestjs-config`) |

## 注册与认证

```typescript
import { OpenBaoModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    OpenBaoModule.register({
      address: 'http://localhost:8200',
      auth: { method: 'token', token: 's.xxxxx' },
    }),
  ],
})
export class AppModule {}
```

| 选项 | 默认 | 说明 |
|---|---|---|
| `address` | `'http://localhost:8200'` | OpenBao 地址 |
| `auth` | 必填 | 认证方式(见下) |
| `transitMount` | `'transit'` | Transit 引擎挂载路径(信封加密用它生成/加解密 DEK) |
| `renewBufferSeconds` | `30` | 过期前多少秒触发续期 |

四种认证:

```typescript
{ method: 'token', token: 's.xxxxx' }                        // Token 直传
{ method: 'userpass', username, password, mount? }            // 用户名密码(mount 默认 'userpass')
{ method: 'approle', roleId, secretId, mount? }               // AppRole(mount 默认 'approle')
{ method: 'kubernetes', role, jwt?, tokenPath?, mount? }      // K8s ServiceAccount(tokenPath 默认 sa token 文件)
```

## OpenBaoTokenManager 生命周期

- `onModuleInit` 认证拿初始 token;token 认证会用 `lookup-self` 查 TTL,不可查则当作静态 token
- 过期前 `renewBufferSeconds` 秒触发续期(内部按 min 1s 调度);续期失败自动重认证,仍失败 5 秒后重试;`onModuleDestroy` 清理定时器(`unref`,不阻塞进程退出)
- 使用方只关心 `getToken()`;拿不到有效 token 时抛异常,调用方按系统故障处理

## OpenBaoHttpClient

注入即用的 keq 客户端(baseUrl = `{address}/v1/`),由 `@keq-request/cli` 从 OpenBao OpenAPI 规范生成的**全量强类型客户端**,覆盖 KV/Transit/Token/Auth/System 全部端点:

```typescript
import { OpenBaoHttpClient } from '@buka/nestjs-kit'

@Injectable()
export class SecretService {
  constructor(private readonly openbao: OpenBaoHttpClient) {}

  async read(path: string) {
    return this.openbao.kvReadDataPath({ path })          // { data: {...} }
  }
  async write(path: string, data: unknown) {
    return this.openbao.kvWriteDataPath({ path, argData: data })
  }
}
```

- 方法名 = 端点路径扁平化的 `group + verb + 细节`(如 `kvReadDataPath`/`transitGenerateDataKey`/`tokenCreate`),按 IDE 类型补全即可,无需记忆:KV 读写用 `kvReadDataPath({ path })` / `kvWriteDataPath({ path, argData })`
- 请求自动附 `X-Vault-Token`(认证端点白名单除外:`/auth/*/login`、`/sys/health|init|seal-status|unseal|leader|generate-root|rekey`)
- 内部已校验 HTTP 状态码,4xx/5xx 抛带状态码的异常

## setOpenBaoToken 中间件

给**自建的 keq 客户端**(非模块注入的那个)透传 token,典型场景是把 token 带给下游信任代理:

```typescript
import { setOpenBaoToken } from '@buka/nestjs-kit'

const request = keq({ baseUrl: 'http://localhost:8200/v1' })
request.use(setOpenBaoToken(() => this.tokenManager.getToken()))
// 非认证端点同样跳过 X-Vault-Token 头
```

## 配置基类

```typescript
import { Configuration } from '@buka/nestjs-config'
import { OpenBaoConfig } from '@buka/nestjs-kit'

@Configuration('OPENBAO')
export class AppOpenBaoConfig extends OpenBaoConfig {}
// OPENBAO_ADDRESS / OPENBAO_AUTH_*(嵌套 auth 配置带类型校验)
```

## 注意事项

- `EnvelopeEncryptionModule` 依赖本模块——用信封加密前必须先注册 `OpenBaoModule`(见 [nestjs-kit-crypto](../nestjs-kit-crypto/SKILL.md))
- token 认证方式的 token TTL 不足 `renewBufferSeconds` 时续期窗口会紧张,token 最好具备 renew 能力或 TTL 足够长
- 认证凭证是敏感信息:`secretAccessKey`/`password`/`secretId` 经环境变量(`OpenBaoConfig`)注入,仓库内不含明文凭证
- 业务代码直接注入 `OpenBaoHttpClient`(token 自动附加);自建 `keq()` 再手挂 token 只用于「setOpenBaoToken 中间件」的透传场景
- kubernetes 认证场景由模块从 `tokenPath` 自动读取 jwt,轮换时无需业务感知

## 相关 skills

- [nestjs-kit-crypto](../nestjs-kit-crypto/SKILL.md) — 信封加密依赖 OpenBao transit(KEK)
- [nestjs-kit-http](../nestjs-kit-http/SKILL.md) — keq 中间件与错误处理