# Keq — HTTP 请求错误处理工具

## 概述

`keq` 模块提供一套基于 [keq](https://www.npmjs.com/package/keq) HTTP 客户端的错误处理工具，包含自定义异常类和响应错误中间件，用于自动解析服务端返回的统一错误格式并抛出对应的异常。

模块核心能力：

- **`BukaRequestException`** — 集成 Buka 错误码体系的请求异常类，携带结构化错误码和异常详情
- **`throwOnResponseError`** — keq 中间件，自动检测 4xx/5xx 响应并解析错误体抛出异常

```typescript
import { BukaRequestException, throwOnResponseError } from "@buka/nestjs-kit";
```

> 此模块不是 NestJS 模块，无需在 `@Module` 的 `imports` 中注册，直接在代码中导入使用即可。

## `BukaRequestException`

基于 `keq` 的 `RequestException` 扩展的自定义异常类，集成了 Buka 错误码体系和异常详情，使 HTTP 请求错误能够携带结构化错误码信息。

### 构造函数

```typescript
constructor(statusCode: number, message: string, options: BukaRequestExceptionOptions)
```

### 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 | — | Buka 错误码字符串（如 `"B0-AAAB-AAAB-001"`） |
| `details` | `ExceptionDetail[]` | 否 | `[]` | 异常详情数组 |
| `response` | `Response` | 否 | — | 原始 Response 对象 |
| `fatal` | `boolean` | 否 | — | 是否标记为致命错误（不可重试） |

### 属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `string` | 错误码字符串 |
| `errorCode` | `ErrorCode` | 解析后的 ErrorCode 对象（来自 `@buka/error-codes`），可获取错误类别、系统 ID 等字段 |
| `details` | `ExceptionDetail[]` | 异常详情数组 |

### 使用示例

```typescript
import { BukaRequestException } from "@buka/nestjs-kit";

// 手动创建请求异常
throw new BukaRequestException(400, "Invalid input", {
  code: "B0-AAAB-AAAB-001",
  details: [
    { type: "field_validation", field: "email", message: "格式不正确" },
  ],
  fatal: false,
});
```

> 通常不需要手动创建 `BukaRequestException`，`throwOnResponseError` 中间件会自动解析服务端响应并抛出该异常。

## `throwOnResponseError`

keq 中间件，在请求完成后自动检查响应状态码。当状态码 ≥ 400 时，解析响应体中的统一错误格式并抛出对应的异常。

### 函数签名

```typescript
function throwOnResponseError(options?: ThrowOnResponseErrorOptions): KeqMiddleware
```

### 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `errorDispatchers` | `Record<string, new (...args) => BukaRequestException>` | 否 | — | 自定义异常分发器，根据错误码 `code` 分发到不同的异常类 |
| `debug` | `boolean` | 否 | `false` | 开启后，错误体解析失败时输出 NestJS debug 日志 |

### 错误处理流程

1. 请求完成后，若响应状态码 < 400，直接放行
2. 检查 `Content-Type` 是否为 `application/json`，非 JSON 响应降级为通用异常
3. 解析 JSON 响应体，提取 `error.code`、`error.message`、`error.details`
4. 若配置了 `errorDispatchers` 且当前错误码匹配，使用对应的自定义异常类
5. 否则抛出 `BukaRequestException`（包含错误码和详情信息）
6. 对于 `401`、`403`、`404` 响应，自动标记 `fatal: true`（不触发重试）
7. 若 JSON 解析失败或响应体不符合预期格式，降级为通用异常（由 `@keq-request/exception` 的 `createExceptionByStatusCode` 生成）
8. 若 `debug: true`，解析失败时输出 NestJS debug 日志

### 基础使用

```typescript
import { keq } from "keq";
import { throwOnResponseError } from "@buka/nestjs-kit";

const client = keq();

// 全局注册中间件
client.use(throwOnResponseError());

// 发送请求，4xx/5xx 响应将自动抛出异常
try {
  const user = await client.get("https://api.example.com/users/1");
} catch (error) {
  if (error instanceof BukaRequestException) {
    console.log(error.code); // "B0-AAAB-AAAB-001"
    console.log(error.message); // "User not found"
    console.log(error.details); // []
  }
}
```

### 单次请求使用

```typescript
import { keq } from "keq";
import { throwOnResponseError } from "@buka/nestjs-kit";

const client = keq();

// 仅在当前请求上使用中间件
const user = await client
  .get("https://api.example.com/users/1")
  .middleware(throwOnResponseError());
```

### 自定义错误分发

```typescript
import { keq } from "keq";
import {
  throwOnResponseError,
  BukaRequestException,
} from "@buka/nestjs-kit";

// 自定义异常类，按需扩展业务逻辑
class UserNotFoundException extends BukaRequestException {}
class PermissionDeniedException extends BukaRequestException {}

const client = keq();

client.use(
  throwOnResponseError({
    errorDispatchers: {
      "B0-AAAB-AAAB-001": UserNotFoundException,
      "B0-AAAB-AAAB-002": PermissionDeniedException,
    },
  })
);

try {
  await client.get("https://api.example.com/users/999");
} catch (error) {
  if (error instanceof UserNotFoundException) {
    // 处理用户不存在
  } else if (error instanceof PermissionDeniedException) {
    // 处理权限不足
  } else if (error instanceof BukaRequestException) {
    // 处理其他 Buka 错误
  }
}
```

### 开启调试模式

```typescript
import { keq } from "keq";
import { throwOnResponseError } from "@buka/nestjs-kit";

const client = keq();

client.use(
  throwOnResponseError({
    debug: true, // 响应体解析失败时输出 NestJS debug 日志
  })
);
```

## 注意事项

> `throwOnResponseError` 中间件假定服务端返回的 JSON 错误体遵循 Buka 统一异常响应格式，即 `{ error: { code, message, details } }` 结构。如果服务端使用其他格式或不返回 JSON，中间件会降级为通用异常。

> 中间件为 `401`、`403`、`404` 状态码自动设置 `fatal: true`，其他状态码不设置 `fatal` 属性。如需自定义此行为，可以通过 `errorDispatchers` 自行创建异常实例。

> 中间件的 `__keqMiddlewareName__` 为 `"throwOnResponseError"`，可供 keq 调试和日志追踪使用，避免重复注册时添加相同中间件。
