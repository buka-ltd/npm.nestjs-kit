# @buka/nestjs-kit

实现符合 Buka API 规范的 NestJS 开发套件。

## 安装

```bash
pnpm install @buka/nestjs-kit
```

## 快速开始

```typescript
import { Module } from "@nestjs/common";
import {
  BukaModule,
  LoggerModule,
  ExceptionModule,
  BlindIndexModule,
  SaltedHashModule,
} from "@buka/nestjs-kit";

@Module({
  imports: [
    // 核心模块（全局验证管道）
    BukaModule.register({}),

    // 统一日志（Grafana/Loki 友好 JSON 格式）
    LoggerModule.register({ serviceName: "my-service" }),

    // 异常处理（systemId 支持十进制数字或 Crockford Base32 字符串）
    ExceptionModule.register({ systemId: "Z9" }),

    // 盲索引和加盐哈希无需配置
    BlindIndexModule,
    SaltedHashModule,
  ],
})
export class AppModule {}
```

## 模块一览

| 模块                       | 简介                                                                            | 文档                                               |
| -------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Core**                   | 全局验证管道、UUIDv7 校验管道、Model 装饰器、分页查询、类型转换工具、URN 工具类 | [core/index.md](./core/index.md)                   |
| **MikroORM**               | MikroORM 实体装饰器、基础实体类、类型工具                                       | [mikro-orm.md](./mikro-orm.md)                     |
| `ExceptionModule`          | 统一异常处理，基于错误码体系                                                    | [exception.md](./exception.md)                     |
| `OpenBaoModule`            | OpenBao（Vault 兼容）客户端集成                                                 | [open-bao.md](./open-bao.md)                       |
| `EnvelopeEncryptionModule` | KEK/DEK 两层信封加密                                                            | [envelope-encryption.md](./envelope-encryption.md) |
| `BlindIndexModule`         | 对加密数据生成可搜索的哈希索引                                                  | [blind-index.md](./blind-index.md)                 |
| `SaltedHashModule`         | 密码安全存储与校验（bcrypt）                                                    | [salted-hash.md](./salted-hash.md)                 |
| `ObjectStorageModule`      | S3 兼容的对象存储客户端                                                         | [object-storage.md](./object-storage.md)           |
| `LoggerModule`        | 统一日志方案，基于 nestjs-pino，Grafana/Loki 友好格式                          | [logger.md](./logger.md)                         |
| **SwaggerPatcher**         | Swagger 文档后处理工具                                                          | [swagger-patcher.md](./swagger-patcher.md)         |

## 模块依赖关系

```
BukaModule               (独立，建议所有项目引入)
ExceptionModule           (独立)
LoggerModule          (独立)
OpenBaoModule             (独立)
EnvelopeEncryptionModule  ──依赖──▶ OpenBaoModule
BlindIndexModule          (独立)
SaltedHashModule          (独立)
ObjectStorageModule       (独立)
MikroORM 工具集           (独立，需安装 @mikro-orm/core)
SwaggerPatcher            (独立，需安装 @nestjs/swagger)
Urn                       (Core 模块内置，无需单独注册)
```

> `EnvelopeEncryptionModule` 内部通过 `KmsProvider` 调用 `OpenBaoHttpClient`，因此必须先注册 `OpenBaoModule`。

## 子包导入

除主入口 `@buka/nestjs-kit` 外，MikroORM 相关功能通过子路径导入：

```typescript
// 主入口：Core 模块 + 功能模块
import { BukaModule, Model, Property, PickType, Slice } from "@buka/nestjs-kit";

// MikroORM 子包
import {
  Column,
  Cardinality,
  DiscreteEntity,
} from "@buka/nestjs-kit/mikro-orm";
```
