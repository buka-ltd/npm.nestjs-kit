# ExceptionModule — 异常处理模块

## 概述

`ExceptionModule` 提供统一的异常处理机制，基于结构化错误码体系。错误码规范详见 [`@buka/error-codes` 规范文档](https://github.com/buka-inc/npm.error-codes/blob/main/docs/specification.md)。

模块核心能力：

- 9 种异常工厂函数，覆盖系统、业务、认证、限流等常见分类
- `@ModuleExceptions` 装饰器按模块组织异常定义
- `ErrorCodeRegistry` 注册中心，自动校验错误码唯一性
- `ErrorCodeExceptionFilter` 全局过滤器，将异常转换为标准 JSON 响应

```typescript
import {
  ExceptionModule,
  ModuleExceptions,
  BusinessException,
  SystemException,
  ErrorCodeRegistry,
} from '@buka/nestjs-kit'
```

## 模块配置

```typescript
// 使用十进制数字
ExceptionModule.register({ systemId: 1001 })

// 使用 Crockford Base32 字符串（等价于上面的 1001）
ExceptionModule.register({ systemId: 'Z9' })
```

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `systemId` | `number \| string` | 是 | 系统 ID（0 - 1048575），全公司唯一，用于区分不同业务系统。支持十进制数字或 Crockford Base32 字符串 |

`register` 内部会将 `systemId` 注册到 `ErrorCodeRegistry`，并自动添加 `ErrorCodeExceptionFilter` 为全局异常过滤器。

## 异常工厂函数

提供 9 种异常工厂，每种对应一个 `ErrorCategory` 和默认 HTTP 状态码：

| 工厂函数 | ErrorCategory | 默认 HTTP 状态码 | 适用场景 |
|----------|---------------|-----------------|---------|
| `SystemException` | `SYSTEM` | 500 | 系统级错误（数据库故障、内部错误） |
| `BusinessException` | `BUSINESS` | 400 | 业务逻辑错误（资源不存在、余额不足） |
| `ValidationException` | `VALIDATION` | 400 | 参数校验错误 |
| `ThirdPartyException` | `THIRD_PARTY` | 502 | 第三方服务调用失败 |
| `AuthException` | `AUTH` | 401 | 认证/授权错误 |
| `RateLimitException` | `RATE_LIMIT` | 429 | 请求被限流 |
| `DegradeException` | `DEGRADE` | 503 | 服务降级 |
| `ConflictException` | `CONFLICT` | 409 | 资源状态冲突 |
| `FeatureException` | `FEATURE` | 403 | 功能未开放或权限不足 |

### 固定消息模式

```typescript
static readonly NotFound = BusinessException({
  sequenceId: 1,
  message: 'User not found',
  description: '根据条件未找到用户，请确认用户是否存在',
})
```

> 固定消息模式下，若未指定 `description`，默认使用 `message` 的值。

生成的异常类支持两种构造方式：

```typescript
throw new UserExceptions.NotFound()            // 使用默认消息
throw new UserExceptions.NotFound('自定义消息') // 覆盖默认消息
```

### 消息工厂模式

```typescript
static readonly NotFoundById = BusinessException({
  sequenceId: 2,
  messageFactory: (userId: string) => `User ${userId} not found`,
  description: '根据 ID 查询用户不存在，请检查 ID 是否正确',
})
```

```typescript
throw new UserExceptions.NotFoundById('123')
// → 消息: "User 123 not found"
```

### 工厂选项

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sequenceId` | `number` | 是 | 序列号（0 - 32767），同模块内同类别唯一 |
| `message` | `string` | 与 `messageFactory` 二选一 | 固定错误消息 |
| `messageFactory` | `(...args) => string` | 与 `message` 二选一 | 消息工厂函数 |
| `httpStatus` | `HttpStatus` | 否 | 自定义 HTTP 状态码，默认使用类别对应的状态码 |
| `description` | `string` | 否 | 错误描述，用于错误码查询接口展示详细信息和解决方案。固定消息模式下默认使用 `message` 的值 |

## @ModuleExceptions 装饰器

类装饰器，用于将一组异常定义绑定到指定的 `moduleId`。装饰器会遍历类的静态属性，将 `PendingException` 转换为真正的异常类，并注册到 `ErrorCodeRegistry`。

```typescript
// 使用 Crockford Base32 字符串（推荐，与错误码可读格式一致）
@ModuleExceptions({ moduleId: '1000' })
export class UserExceptions {
  static readonly NotFound = BusinessException({
    sequenceId: 1,
    message: 'User not found',
  })

  static readonly AlreadyExists = BusinessException({
    sequenceId: 2,
    message: 'User already exists',
  })

  static readonly InvalidEmail = ValidationException({
    sequenceId: 1,
    message: 'Invalid email format',
  })
}

// 也支持十进制数字（等价于 '1000'，即 32768）
@ModuleExceptions({ moduleId: 32768 })
export class UserExceptions { /* ... */ }
```

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `moduleId` | `number \| string` | 是 | 模块 ID，每个模块唯一。支持十进制数字（0 - 1048575）或 Crockford Base32 字符串（`0000` - `ZZZZ`） |

> `moduleId: 0` 为系统保留，用于映射 NestJS 内置 HTTP 异常。业务模块应在 `1000` - `FZZZ` 范围内分配。

## ErrorCodeRegistry

单例注册中心，负责管理 `systemId`、校验 `moduleId` 和错误码的唯一性。

### 常用方法

| 方法 | 说明 |
|------|------|
| `getInstance()` | 获取单例实例 |
| `setSystemId(id)` | 配置系统 ID（仅可设置一次） |
| `getSystemId()` | 获取系统 ID |
| `registerModule(moduleId, name)` | 注册模块 ID |
| `register(meta, className, description?)` | 注册错误码（自动校验唯一性），可附带描述信息 |
| `getDescription(key)` | 获取错误码描述 |
| `getAllRegisteredCodes()` | 获取所有已注册的错误码 |
| `getAllRegisteredModules()` | 获取所有已注册的模块 |

> 通常不需要直接调用 `ErrorCodeRegistry`，`ExceptionModule.register()` 和 `@ModuleExceptions` 会自动完成注册。

## 错误码查询接口

`ExceptionModule` 自动注册 `GET /error-codes` 接口，返回所有已注册错误码的列表。每个错误码条目包含 `metadata` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `moduleName` | `string` | 模块名称 |
| `phrase` | `string` | 错误短语（异常类的属性名） |
| `description` | `string?` | 错误描述，包含详细信息和解决方案 |

`description` 来源于异常工厂函数的 `description` 选项。固定消息模式下若未指定，默认使用 `message` 值；消息工厂模式下若未指定则为空。

## ErrorCodeExceptionFilter

全局异常过滤器，自动由 `ExceptionModule.register()` 注册。处理三类异常：

1. **自定义业务异常**（`HttpException` from `@buka/nestjs-kit`）→ 使用异常自身的错误码
2. **NestJS 内置 HTTP 异常** → 映射 HTTP 状态码到预留错误码（`moduleId: 0`）
3. **未知异常** → 返回 `SYSTEM` 类别的 500 错误码

### 响应格式

异常响应统一为以下 JSON 结构：

```json
{
  "error": {
    "code": "B0-AAAB-AAAB-001",
    "message": "User not found",
    "details": []
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 结构化错误码字符串，格式由 `@buka/error-codes` 的 `ErrorCode` 定义 |
| `message` | `string` | 错误消息 |
| `details` | `ExceptionDetail[]` | 异常详情数组 |

### HTTP 状态码映射

NestJS 内置 HTTP 异常会被映射到预留错误码（`moduleId: 0`）：

| HTTP 状态码 | ErrorCategory | 保留 sequenceId |
|-------------|---------------|----------------|
| 400 | `VALIDATION` | 400 |
| 401 | `AUTH` | 401 |
| 403 | `AUTH` | 403 |
| 404 | `BUSINESS` | 404 |
| 409 | `CONFLICT` | 409 |
| 415 | `VALIDATION` | 415 |
| 429 | `RATE_LIMIT` | 429 |
| 500 | `SYSTEM` | 500 |
| 502 | `THIRD_PARTY` | 502 |
| 503 | `DEGRADE` | 503 |
| 504 | `THIRD_PARTY` | 504 |

> `moduleId: 0` 为系统保留，业务模块应从 1 开始分配。

### BukaExceptions — 内置异常

`BukaExceptions` 是 `moduleId: 0` 对应的内置异常类，与上表中的 HTTP 状态码映射一一对应。可以直接使用这些异常，而不必依赖 NestJS 内置 `HttpException` 被 filter 隐式映射：

```typescript
import { BukaExceptions } from '@buka/nestjs-kit'

// 直接抛出内置异常
throw new BukaExceptions.BadRequest()
throw new BukaExceptions.BadRequest('自定义消息')
throw new BukaExceptions.NotFound()
throw new BukaExceptions.Unauthorized()
```

完整列表：

| 异常 | ErrorCategory | sequenceId |
|------|---------------|------------|
| `BukaExceptions.BadRequest` | `VALIDATION` | 400 |
| `BukaExceptions.UnsupportedMediaType` | `VALIDATION` | 415 |
| `BukaExceptions.Unauthorized` | `AUTH` | 401 |
| `BukaExceptions.Forbidden` | `AUTH` | 403 |
| `BukaExceptions.NotFound` | `BUSINESS` | 404 |
| `BukaExceptions.Conflict` | `CONFLICT` | 409 |
| `BukaExceptions.TooManyRequests` | `RATE_LIMIT` | 429 |
| `BukaExceptions.InternalServerError` | `SYSTEM` | 500 |
| `BukaExceptions.BadGateway` | `THIRD_PARTY` | 502 |
| `BukaExceptions.GatewayTimeout` | `THIRD_PARTY` | 504 |
| `BukaExceptions.ServiceUnavailable` | `DEGRADE` | 503 |

如需禁用全局过滤器以自定义异常处理：

```typescript
ExceptionModule.register({
  systemId: 1001,
  useGlobalFilter: false,
})
```

## 异常详情

通过实现 `ExceptionDetail` 接口来定义结构化的错误详情：

```typescript
import { ExceptionDetail, ValidationException } from '@buka/nestjs-kit'

class FieldValidationDetail implements ExceptionDetail {
  readonly type = 'field_validation'
  constructor(
    public readonly field: string,
    public readonly message: string,
  ) {}
}

// 定义异常
export class InvalidUserInputException extends ValidationException({
  moduleId: 10,
  sequenceId: 10,
  message: 'Invalid user input',
}) {}

// 使用
throw new InvalidUserInputException('Validation failed', [
  new FieldValidationDetail('email', 'Invalid email format'),
  new FieldValidationDetail('age', 'Must be a positive number'),
])
```

## 完整使用示例

### 1. 配置模块

```typescript
import { Module } from '@nestjs/common'
import { ExceptionModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    // systemId 支持十进制数字或 Crockford Base32 字符串
    ExceptionModule.register({ systemId: 'Z9' }),
  ],
})
export class AppModule {}
```

### 2. 定义异常

```typescript
import {
  ModuleExceptions,
  BusinessException,
  ValidationException,
  AuthException,
} from '@buka/nestjs-kit'

// moduleId 支持 Crockford Base32 字符串（推荐）或十进制数字
@ModuleExceptions({ moduleId: '1000' })
export class UserExceptions {
  static readonly NotFound = BusinessException({
    sequenceId: 1,
    message: 'User not found',
    description: '根据条件未找到用户，请确认用户是否存在',
  })

  static readonly NotFoundById = BusinessException({
    sequenceId: 2,
    messageFactory: (userId: string) => `User ${userId} not found`,
    description: '根据 ID 查询用户不存在，请检查 ID 是否正确',
  })

  static readonly InvalidEmail = ValidationException({
    sequenceId: 1,
    message: 'Invalid email format',
  })

  static readonly Unauthorized = AuthException({
    sequenceId: 1,
    message: 'Authentication required',
  })
}
```

### 3. 在 Controller 中抛出异常

```typescript
import { Controller, Get, Param } from '@nestjs/common'
import { UserExceptions } from './user.exceptions'

@Controller('users')
export class UserController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id)

    if (!user) {
      throw new UserExceptions.NotFoundById(id)
    }

    return user
  }
}
```

## 二方包定义异常

二方包只需定义异常类，不需要关心 `systemId`：

```typescript
// packages/payment-sdk/src/payment.exceptions.ts
import { ThirdPartyException, BusinessException } from '@buka/nestjs-kit'

const MODULE_ID = 100 // 支付模块

export class PaymentTimeoutException extends ThirdPartyException({
  moduleId: MODULE_ID,
  sequenceId: 1,
  message: 'Payment gateway timeout',
}) {}

export class PaymentGatewayErrorException extends ThirdPartyException({
  moduleId: MODULE_ID,
  sequenceId: 2,
  message: 'Payment gateway error',
}) {}
```

业务系统导入二方包后，异常会自动使用业务系统配置的 `systemId`。

## 注意事项

> 异常工厂函数返回的是 `PendingException`，必须配合 `@ModuleExceptions` 装饰器使用。如果忘记添加装饰器直接实例化，会抛出友好的错误提示。

> `sequenceId` 在同一个 `moduleId` 和 `ErrorCategory` 下必须唯一，重复注册会在应用启动时抛出异常。

> 异常类的 `name` 会被自动设置为 `ModuleName.PropertyName`（如 `UserExceptions.NotFound`），方便调试和日志追踪。
