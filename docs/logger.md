# LoggerModule — 日志模块

## 概述

`LoggerModule` 提供统一的日志方案，基于 [nestjs-pino](https://github.com/iamolegga/nestjs-pino) 和 [pino](https://github.com/pinojs/pino) 构建。预配置 Grafana/Loki 友好的 JSON 日志格式，自动注入服务元数据（服务名、环境、版本号）。

模块核心能力：

- 开箱即用的 JSON 日志，无缝对接 Grafana/Loki
- 自动注入 `service`、`environment`、`version` 元数据
- 开发模式 `pino-pretty` 彩色输出
- `@InjectLogger()` 装饰器，自动以类名为日志上下文
- 支持同步和异步两种注册方式
- 可配合 `@buka/nestjs-config` 使用

```typescript
import { LoggerModule, Logger, InjectLogger } from '@buka/nestjs-kit'
```

## 模块配置

### register（同步注册）

直接传入配置对象：

```typescript
import { Module } from '@nestjs/common'
import { LoggerModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    LoggerModule.register({
      serviceName: 'my-service',
      environment: 'production',
      version: '1.0.0',
      level: 'info',
    }),
  ],
})
export class AppModule {}
```

### registerAsync（异步注册）

从其他配置源（如 `@buka/nestjs-config`）获取配置：

```typescript
import { Module } from '@nestjs/common'
import { LoggerModule } from '@buka/nestjs-kit'
import { ConfigModule, PinoConfig } from '@buka/nestjs-config'

@Module({
  imports: [
    ConfigModule.inject(PinoConfig, LoggerModule, (config) => ({
      serviceName: config.serviceName,
      level: config.level,
      pretty: config.pretty,
    })),
  ],
})
export class AppModule {}
```

也可以使用标准的 `useFactory` 模式：

```typescript
@Module({
  imports: [
    LoggerModule.registerAsync({
      inject: [MyConfigService],
      useFactory: (config: MyConfigService) => ({
        serviceName: config.name,
        level: config.logLevel,
      }),
    }),
  ],
})
export class AppModule {}
```

> `LoggerModule` 是 `@Global()` 全局模块，只需在 AppModule 中注册一次，所有模块均可使用。

## 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `serviceName` | `string` | 否 | `'unknown'` | 服务名称，Grafana/Loki 中按服务过滤日志 |
| `environment` | `string` | 否 | `NODE_ENV` 或 `'development'` | 运行环境 |
| `version` | `string` | 否 | `npm_package_version` 或 `'0.0.0'` | 服务版本号，生产环境由 CI/CD 注入 |
| `level` | `string` | 否 | `'info'` | 日志级别：`'fatal'`、`'error'`、`'warn'`、`'info'`、`'debug'`、`'trace'` |
| `pretty` | `boolean` | 否 | `false` | 开发模式——启用 `pino-pretty` 彩色输出，生产环境设为 `false` 输出原生 JSON |

## 日志输出格式

### 生产环境（`pretty: false`，默认）

原生 JSON 格式，每行一条 JSON 日志，Grafana/Loki 可直接索引：

```json
{
  "level": "info",
  "time": "2025-05-10T08:30:00.000Z",
  "reqId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": "my-service",
  "environment": "production",
  "version": "1.0.0",
  "msg": "request completed",
  "req": { "method": "GET", "url": "/api/users" },
  "res": { "statusCode": 200 },
  "responseTime": 42
}
```

### 开发环境（`pretty: true`）

启用 `pino-pretty` 传输，彩色人性化输出。

## HTTP 自动日志

模块自动记录每个 HTTP 请求的完成日志，包含：

- 请求方法、URL
- 响应状态码
- 响应耗时（`responseTime`，毫秒）
- 请求 ID（优先上游 `X-Request-Id` 头，否则自动生成 UUID）

健康检查端点 `/api/v1/health` 的请求会被自动忽略，避免日志噪音。

## @InjectLogger 装饰器

在构造函数中注入 `Logger`，自动以当前类名为日志上下文：

```typescript
import { Injectable } from '@nestjs/common'
import { InjectLogger } from '@buka/nestjs-kit'
import { Logger } from '@buka/nestjs-kit'

@Injectable()
export class UserService {
  constructor(
    @InjectLogger()
    private readonly logger: Logger,
  ) {}

  async findOne(id: string) {
    this.logger.info('查询用户', { userId: id })
    // 日志上下文自动为 "UserService"
  }
}
```

如需自定义上下文名称：

```typescript
@InjectLogger('CustomContext')
private readonly logger: Logger
```

> `@InjectLogger()` 等价于 `@InjectPinoLogger(UserService.name)`，省去手动填写类名。

## LoggerConfig 配置基类

`LoggerConfig` 是配合 `@buka/nestjs-config` 使用的配置基类，字段与 `LoggerModuleOptions` 一一对应：

```typescript
import { Configuration } from '@buka/nestjs-config'
import { LoggerConfig } from '@buka/nestjs-kit'

@Configuration('LOG')
export class AppLoggerConfig extends LoggerConfig {
  // 继承以下字段，可通过环境变量覆盖：
  // LOG_SERVICE_NAME
  // LOG_ENVIRONMENT
  // LOG_VERSION
  // LOG_LEVEL
  // LOG_PRETTY
}
```

然后通过 `ConfigModule.inject` 注入：

```typescript
ConfigModule.inject(AppLoggerConfig, LoggerModule, (config) => ({
  serviceName: config.serviceName,
  level: config.level,
  pretty: config.pretty,
}))
```

### 配置字段

| 字段 | 类型 | 默认值 | 环境变量示例 |
|------|------|--------|-------------|
| `serviceName` | `string` | `'unknown'` | `LOG_SERVICE_NAME=my-service` |
| `environment` | `string` | `NODE_ENV` 或 `'development'` | `LOG_ENVIRONMENT=production` |
| `version` | `string` | `npm_package_version` 或 `'0.0.0'` | `LOG_VERSION=1.0.0` |
| `level` | `'fatal' \| 'error' \| 'warn' \| 'info' \| 'debug' \| 'trace'` | `'info'` | `LOG_LEVEL=debug` |
| `pretty` | `boolean` | `false` | `LOG_PRETTY=true` |

## LoggerErrorInterceptor

模块自动注册 `LoggerErrorInterceptor`，在异常抛出时自动记录错误日志，包含请求上下文和错误堆栈。

## 模块依赖关系

```
LoggerModule  ──依赖──▶ nestjs-pino (pino)
```

> `LoggerModule` 仅依赖 `nestjs-pino`（peer dependency），不依赖 `@buka/nestjs-kit` 中的其他模块。

## 完整使用示例

### 1. 注册模块

```typescript
import { Module } from '@nestjs/common'
import { LoggerModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    LoggerModule.register({
      serviceName: 'user-service',
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      pretty: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

### 2. 在 Service 中使用

```typescript
import { Injectable } from '@nestjs/common'
import { InjectLogger } from '@buka/nestjs-kit'
import { Logger } from '@buka/nestjs-kit'

@Injectable()
export class OrderService {
  constructor(
    @InjectLogger()
    private readonly logger: Logger,
  ) {}

  async createOrder(data: CreateOrderDto) {
    this.logger.info('开始创建订单', { userId: data.userId })

    try {
      const order = await this.save(data)
      this.logger.info('订单创建成功', { orderId: order.id })
      return order
    } catch (error) {
      this.logger.error('订单创建失败', { error, userId: data.userId })
      throw error
    }
  }
}
```

### 3. 在 Controller 中使用

```typescript
import { Controller, Get, Param } from '@nestjs/common'
import { InjectLogger } from '@buka/nestjs-kit'
import { Logger } from '@buka/nestjs-kit'

@Controller('users')
export class UserController {
  constructor(
    @InjectLogger()
    private readonly logger: Logger,
  ) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug('收到查询用户请求', { userId: id })
    return this.userService.findOne(id)
  }
}
```

## 注意事项

> `LoggerModule` 是全局模块，应在 AppModule 中只注册一次。重复注册会导致 nestjs-pino 初始化冲突。

> 生产环境建议将 `pretty` 设为 `false`（默认值），输出原生 JSON 以获得最优的 Loki 写入性能和索引效率。

> `LoggerErrorInterceptor` 由模块自动注册。如需自定义错误拦截器，可以在 providers 中覆盖。
