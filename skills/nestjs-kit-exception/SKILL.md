---
name: nestjs-kit-exception
description: >
  在 NestJS 代码里抛出业务异常、声明或修改模块错误码时加载本 skill。覆盖 @ModuleExceptions 错误码声明、9 个异常工厂(Business/System/ThirdParty/Auth/Validation/Conflict/Feature/RateLimit/Degrade)、统一错误响应 {error:{code,message,details}}、ExceptionDetail 结构化详情、二方包认领 moduleId 与 GET /error-codes 查询。
---

# 异常与错误码(ExceptionModule)

错误码规范由 `@buka/error-codes` / `@buka/exception` 定义。ExceptionModule 注册后自动装配全局 `ErrorCodeExceptionFilter` 并注册 `GET /error-codes` 错误码查询接口。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 注册统一异常处理 | `ExceptionModule.register({ systemId })` |
| 按模块组织异常定义 | `@ModuleExceptions({ moduleId })` + 9 个工厂 |
| 业务逻辑错误 | `BusinessException`(默认 400) |
| 系统/内部错误 | `SystemException`(默认 500) |
| 第三方服务失败 | `ThirdPartyException`(默认 502) |
| 认证/权限 | `AuthException`(401) / `FeatureException`(403) |
| 资源冲突 | `ConflictException`(409) |
| 参数校验错误 | `ValidationException`(400) |
| 限流/降级 | `RateLimitException`(429) / `DegradeException`(503) |
| 直接抛内置常用异常 | `BukaExceptions.NotFound` 等 |
| 客户端门禁（版本过低 / 维护 / 付费资格 / 方案上限） | `ClientGateExceptions.*` |
| 结构化错误详情 | `ExceptionDetail`(details 参数) |

## 文件位置

模块专属异常集中声明于模块根目录的 `<module-name>.exceptions.ts`(所有 `@ModuleExceptions` 类写在这一个文件里,目录规范见 [nestjs-kit-coding-standards 「目录组织」章](../nestjs-kit-coding-standards/SKILL.md#业务模块目录组织))。

## 注册

```typescript
import { ExceptionModule } from '@buka/nestjs-kit'

@Module({ imports: [ExceptionModule.register({ systemId: 'Z9' })] })
export class AppModule {}
```

- `systemId`(0-1048575,十进制或 Crockford Base32)全局唯一标识一个服务,接入时从错误码登记处获取,业务代码不自行编造
- 注册后自动装配全局 `ErrorCodeExceptionFilter`(恒装配、不可禁用——没有 `useGlobalFilter` 选项),并注册 `GET /error-codes` 错误码查询接口
- 一个进程只注册一个 systemId

## 9 个异常工厂

| 工厂 | 类别 | 默认 HTTP | 适用场景 |
|---|---|---|---|
| `SystemException` | SYSTEM | 500 | 系统级错误(数据库故障、内部异常) |
| `BusinessException` | BUSINESS | 400 | 业务逻辑错误(资源不存在、状态不合法) |
| `ValidationException` | VALIDATION | 400 | 参数校验错误 |
| `ThirdPartyException` | THIRD_PARTY | 502 | 第三方服务调用失败 |
| `AuthException` | AUTH | 401 | 认证/授权 |
| `RateLimitException` | RATE_LIMIT | 429 | 限流 |
| `DegradeException` | DEGRADE | 503 | 服务降级 |
| `ConflictException` | CONFLICT | 409 | 资源状态冲突(并发修改等) |
| `FeatureException` | FEATURE | 403 | 功能未开放/权限不足 |

工厂选项:`{ sequenceId, message | messageFactory, httpStatus?, description? }`。**工厂不含 `moduleId` 选项**——moduleId 唯一来源是 `@ModuleExceptions` 装饰器。

### 固定消息 vs 消息工厂

```typescript
import { ModuleExceptions, BusinessException } from '@buka/nestjs-kit'

@ModuleExceptions({ moduleId: '1000' })
export class StudentExceptions {
  // 固定消息:未指定 description 时默认取 message 的值
  static readonly NotFound = BusinessException({
    sequenceId: 1,
    message: '学生不存在',
    description: '根据条件未找到学生,请确认学号是否正确',
  })

  // 消息工厂:构造参数参与生成消息
  static readonly NotFoundById = BusinessException({
    sequenceId: 2,
    messageFactory: (studentId: string) => `学生 ${studentId} 不存在`,
  })
}

throw new StudentExceptions.NotFound()                 // 默认消息
throw new StudentExceptions.NotFound('自定义消息')        // 覆盖消息
throw new StudentExceptions.NotFoundById('abc-123')     // 工厂消息
```

- `sequenceId`(0-32767)在**同 moduleId + 同类别**内唯一,重复会在启动注册时直接报错(fail-fast)
- 异常的类 `name` 自动设为 `ModuleName.PropertyName`(如 `StudentExceptions.NotFound`),日志与排障友好

## @ModuleExceptions

- `moduleId`(0-1048575):支持十进制或 Crockford Base32 两种等价写法(示例中的 `'1000'` 是 Base32 写法、对应十进制 32768,错误码与 registry 均以 Base32 呈现)。**`moduleId: 0` 为系统保留**(内置异常映射),业务模块在 `1000`-`FZZZ` 范围内声明
- 工厂返回 `PendingException`,必须由 `@ModuleExceptions` 转正;未装饰即实例化会在编码阶段立即抛错,报错信息包含正确写法示例(属 fail-fast 预期行为)
- `getExceptionModuleId(ExceptionClass)` 可查询已绑定异常类的 moduleId

## 统一响应与内置异常

响应体结构(filter 输出):

```json
{ "error": { "code": "B0-AAAB-AAAB-001", "message": "资源不存在", "details": [] } }
```

`ErrorCodeExceptionFilter` 处理三类:kit 抛出的带码异常(用自己的 code);NestJS 内置 `HttpException`(映射到 `moduleId: 0` 的预留 code);未知异常(SYSTEM 500)。

`BukaExceptions` 是与 `moduleId: 0` 映射一一对应的内置异常,抛标准异常时直接用:

```typescript
throw new BukaExceptions.NotFound()
throw new BukaExceptions.BadRequest('自定义消息')
```

完整列表:`BadRequest`(400)、`Unauthorized`(401)、`Forbidden`(403)、`NotFound`(404)、`Conflict`(409)、`UnsupportedMediaType`(415)、`TooManyRequests`(429)、`InternalServerError`(500)、`BadGateway`(502)、`GatewayTimeout`(504)、`ServiceUnavailable`(503)。

`ClientGateExceptions`(moduleId: 1)是**客户端门禁**:用户此刻做不了某件事、必须完成一个固定动作才能恢复。它占用公共号段,任何系统都可抛出:

```typescript
throw new ClientGateExceptions.PlanLimitReached('成员', 15, 10, [
  { type: 'client_gate', resource: 'members', current: 15, max: 10 },
])
```

列表:`ClientVersionRejected`(1 版本过低)、`EntitlementRequired`(2 需要付费资格)、`EntitlementExpired`(3 付费资格失效)、`Maintenance`(4 维护中)、`CapabilityUnavailable`(5 功能未开放)、`PlanLimitReached`(6 已达方案上限);全部是 `FEATURE`/403。

参数走 `details`(最后一个参数传详情数组),详情以 `type: 'client_gate'` 标识。

> 内置 NestJS HttpException 也能被 filter 隐式映射,但业务代码统一走 `@ModuleExceptions` 工厂——错误码可检索、类别可控,裸 `throw new HttpException`(NestJS 内建类)跳过了错误码体系。

## 结构化详情(ExceptionDetail)

```typescript
import { ExceptionDetail } from '@buka/nestjs-kit'

class FieldErrorDetail implements ExceptionDetail {
  readonly type = 'field_error'
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {}
}

throw new StudentExceptions.Invalid('Invalid input', [
  new FieldErrorDetail('age', 'must be positive'),
])
```

固定消息模式构造第二参为 details;消息工厂模式最后一个参数为 details。详情进入响应体 `error.details`,是前端展示与排障的结构化材料,推荐对复杂校验/冲突场景提供。

## 二方包定义异常

二方包(业务 SDK)不关心 `systemId`,只认领自己的 `moduleId`:

```typescript
// @buka/payment-sdk/payment.exceptions.ts
import { ModuleExceptions, ThirdPartyException } from '@buka/nestjs-kit'

@ModuleExceptions({ moduleId: '016G' })   // 公司统一分配给本包
export class PaymentExceptions {
  static readonly GatewayTimeout = ThirdPartyException({
    sequenceId: 1,
    messageFactory: (orderId: string) => `支付网关超时: ${orderId}`,
  })
}
```

宿主业务项目 `ExceptionModule.register({ systemId })` 后,抛出的 `PaymentExceptions.GatewayTimeout` 错误码自动带上宿主的 systemId。

## 注意事项

- 必须先登记再使用:`sequenceId` 模块内自增管理;`moduleId` 业务模块在 1000-FZZZ 范围内声明(跨服务复用的模块保持一致);`moduleId: 0`(内置 HTTP 语义)与 `1`(客户端门禁)由 kit 占用,不要认领
- `description` 必写——它是 `GET /error-codes` 错误码查询接口的排障材料
- 内部错误使用 `SystemException`;第三方调用失败使用 `ThirdPartyException`(保留上游原始错误码,不包装成 SYSTEM,以正确告警归类)
- 找不到资源用 `BusinessException`/`BukaExceptions.NotFound`
- 全局 filter 恒装配,没有 `useGlobalFilter` 选项可禁用

## 相关 skills

- [nestjs-kit-http](../nestjs-kit-http/SKILL.md) — keq 调上游时响应错误自动转成带码异常
- [nestjs-kit-swagger](../nestjs-kit-swagger/SKILL.md) — `unifyExceptionResponses` 同步异常响应文档