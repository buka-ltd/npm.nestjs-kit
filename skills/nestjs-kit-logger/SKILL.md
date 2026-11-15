---
name: nestjs-kit-logger
description: >
  在 NestJS 代码里注入 logger、写日志、配置日志模块时加载本 skill。覆盖 @InjectLogger(以类名为上下文)、LoggerModule 注册(serviceName/level/pretty)、LoggerConfig 读取 LOG_* 环境变量、pino JSON 结构化日志(HTTP 请求日志、reqId 链路、Loki 检索字段)、脱敏约定。
---

# 统一日志(LoggerModule)

覆盖统一日志,基于 nestjs-pino + pino;LoggerModule 为 `@Global()` 模块,注册一次全局注入。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 注册统一日志 | `LoggerModule.register({ serviceName })` / `registerAsync` |
| 注入 logger | `@InjectLogger()`(自动以类名为上下文) |
| logger 类型 | `Logger`(nestjs-pino 的 PinoLogger re-export) |
| 环境变量配置 | `LoggerConfig`(`@buka/nestjs-config` 的 `LOG_*` 前缀) |
| 异常自动记日志 | `LoggerErrorInterceptor`(模块自动注册) |

## 注册

```typescript
import { LoggerModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    LoggerModule.register({
      serviceName: 'user-service',
      level: 'info',
      pretty: false,               // 生产 false(原生 JSON),本地开发 true(彩色)
    }),
  ],
})
export class AppModule {}
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `serviceName` | `'unknown'` | 服务名,Loki 中按 `service` 字段过滤 |
| `environment` | `NODE_ENV` 或 `'development'` | 运行环境 |
| `version` | `npm_package_version` 或 `'0.0.0'` | 版本号 |
| `level` | `'info'` | `fatal/error/warn/info/debug/trace` |
| `pretty` | `false` | 开发模式 pino-pretty 彩色输出 |

`LoggerModule` 是 `@Global()`,**只在 AppModule 注册一次**(重复注册会引发 nestjs-pino 初始化冲突)。

## @InjectLogger 用法

```typescript
import { Injectable } from '@nestjs/common'
import { InjectLogger, Logger } from '@buka/nestjs-kit'

@Injectable()
export class OrderService {
  constructor(
    @InjectLogger()          // 上下文自动为 "OrderService"
    private readonly logger: Logger,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    this.logger.info('开始创建订单', { userId: dto.userId })   // msg + 结构化字段

    try {
      const order = await this.save(dto)
      this.logger.info('订单创建成功', { orderId: order.id })
      return order
    } catch (error) {
      this.logger.error('订单创建失败', { error, userId: dto.userId })
      throw error            // 必须 rethrow!错误日志由 LoggerErrorInterceptor 统一补录
    }
  }
}
```

- `@InjectLogger('CustomContext')` 可自定义上下文名;等价于 nestjs-pino 的 `@InjectPinoLogger(ClassName)`
- 日志内容习惯:`msg`(中文短语)+ 结构化字段对象(`{ userId, orderId, error }` 而不是拼字符串),Loki 按字段检索

## HTTP 自动日志

模块自动为每个请求输出完成日志:方法、URL、状态码、`responseTime`、`reqId`(优先上游 `X-Request-Id`,否则生成 UUID)。**健康检查端点 `/api/v1/health` 自动忽略**(避免噪音)。生产日志形如:

```json
{ "level": "info", "time": "...", "reqId": "...", "service": "user-service", "environment": "production", "msg": "request completed", "req": { "method": "GET", "url": "/api/users" }, "res": { "statusCode": 200 }, "responseTime": 42 }
```

## LoggerConfig(环境变量配置)

```typescript
import { Configuration } from '@buka/nestjs-config'
import { LoggerConfig } from '@buka/nestjs-kit'

@Configuration('LOG')
export class AppLoggerConfig extends LoggerConfig {}
// 自动从环境变量读取: LOG_SERVICE_NAME / LOG_ENVIRONMENT / LOG_VERSION / LOG_LEVEL / LOG_PRETTY
```

字段默认值与上表一致(`pretty` 用 `ToBoolean` 转换,`level` 用 `@IsIn` 校验)。该配置类配合 `@buka/nestjs-config` 的模块注入使用(`ConfigModule.inject(AppLoggerConfig, LoggerModule, ...)`)。

## 注意事项

- 日志统一经 `@InjectLogger()` 注入:手写 `new Logger()` 或 `console.log/error` 的输出不进 JSON 管道、Loki 不可索引
- 生产 `pretty: false`;本地开发可 `pretty: true`
- catch 里记日志后**必须 rethrow**:错误日志归 `LoggerErrorInterceptor`(模块自动注册)统一输出(含请求上下文与堆栈),业务层重复记完整错误会导致噪音;业务层只记录语义信息(如 `{ userId }`)
- `Logger`/`LoggerErrorInterceptor` 是 nestjs-pino 直接 re-export,方法与选项即 pino 语义
- 日志字段避免 `password`/`token` 等敏感信息,必要时在记日志前脱敏

## 相关 skills

- [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) — 错误码异常与统一错误响应