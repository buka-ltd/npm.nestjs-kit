---
name: nestjs-kit-http
description: >
  在 NestJS 代码里调用下游或第三方服务、处理 keq 请求错误时加载本 skill。覆盖 throwOnResponseError 中间件(上游 4xx/5xx 自动转成带错误码的异常)、errorDispatchers 按上游错误码分发异常类、捕获并处理 BukaRequestException(code/errorCode/details/fatal)、尊重 fatal 标记的重试策略。
---

# 服务间调用(keq 错误处理)

基于 keq。**不是 NestJS 模块**,无需注册,直接代码导入。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 客户端自动把 4xx/5xx 转成带错误码的异常 | `client.use(throwOnResponseError())` |
| 按上游错误码分发不同异常类 | `throwOnResponseError({ errorDispatchers })` |
| 捕获上游错误 | `BukaRequestException`(`code`/`errorCode`/`details`/`fatal`) |

所有 keq 客户端统一挂载该中间件——上游若是 Buka 体系服务(响应体为 `{ error: { code, message, details } }`),错误码自动透传成异常,本服务再按 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) 的方式处理。

## throwOnResponseError

```typescript
import { keq } from 'keq'
import { throwOnResponseError } from '@buka/nestjs-kit'

const client = keq()

// 全局注册(推荐)
client.use(throwOnResponseError())

// 或单次请求
await client.get(url).middleware(throwOnResponseError())
```

处理流程(状态码 ≥ 400 时):

1. `Content-Type` 是 JSON 时解析 `error.code / error.message / error.details`
2. 配置了 `errorDispatchers` 且 `error.code` 命中 → 用对应自定义异常类实例化
3. 否则抛 `BukaRequestException`(带 code 与 details)
4. **`401/403/404` 自动标记 `fatal: true`**(不可重试);其余状态码不设置 fatal
5. JSON 解析失败/非预期格式 → 降级为 keq 通用异常(`debug: true` 时可输出解析失败日志)

前提:上游返回 Buka 统一错误格式。上游不返回 JSON 或不遵循该格式时只能拿到通用异常(无错误码)。

## BukaRequestException

```typescript
import { BukaRequestException } from '@buka/nestjs-kit'

try {
  await client.get('https://api.example.com/users/1')
} catch (error) {
  if (error instanceof BukaRequestException) {
    error.code      // 'B0-AAAB-AAAB-001'(错误码字符串)
    error.errorCode // ErrorCode 对象(category/systemId 等)
    error.details   // ExceptionDetail[]
    error.fatal     // 401/403/404 时为 true
    error.preserveBody / error.response  // keq 异常继承能力
  }
}
```

## 按错误码分发

```typescript
import { BukaRequestException, throwOnResponseError } from '@buka/nestjs-kit'

class UserNotFoundException extends BukaRequestException {}
class PermissionDeniedException extends BukaRequestException {}

client.use(throwOnResponseError({
  errorDispatchers: {
    'B0-AAAB-AAAB-001': UserNotFoundException,
    'B0-AAAB-AAAB-002': PermissionDeniedException,
  },
}))

try {
  await client.get(url)
} catch (error) {
  if (error instanceof UserNotFoundException) { /* 针对性处理 */ }
  else if (error instanceof BukaRequestException) { /* 其他 Buka 错误 */ }
}
```

超类构造为 `(statusCode, message, options)`,分发类可覆写构造注入业务语义。

## 注意事项

- 重试策略注意:401/403/404 被标记 `fatal: true`,上层若实现重试,尊重 `fatal` 直接抛出(这些状态重试无意义)
- 中间件名固定 `throwOnResponseError`,keq `client.use` 同名中间件防重复注册——复用官方实现即可
- 捕获链里把 `BukaRequestException` 与 keq 内建通用异常分开处理,前者有错误码可上抛自己的 moduleId 体系(见 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) 的 `ThirdPartyException`)
- 错误码全链路透传由两侧构成:调用方用本中间件解析上游的 `{ error: { code, ... } }`,被调用方的统一错误响应由 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) 的 `ErrorCodeExceptionFilter` 输出,两侧按各自 skill 使用即可闭合链路

## 相关 skills

- [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) — 被调用方的错误码响应与业务异常