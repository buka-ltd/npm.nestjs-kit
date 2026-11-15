---
name: nestjs-kit-object-storage
description: >
  在 NestJS 代码里上传或下载文件、生成预签名 URL、查询元数据与存在性、删除对象、配置对象存储时加载本 skill。覆盖 S3 与 MinIO、getSignedUrl、ObjectStorageModule(endpoint/bucket/prefix/forcePathStyle)、ObjectStorageModuleConfig 读环境变量、Readable 流的消费与销毁、prefix 两级语义。
---

# 对象存储(ObjectStorageModule)

基于 `@aws-sdk/client-s3`。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 注册对象存储 | `ObjectStorageModule.register({...})` |
| 下载对象(流) | `service.get(path)` → `Readable` |
| 上传(string/Buffer/流) | `service.upload(path, contents)` |
| 元数据 / 存在性 / 删除 | `getMetadata` / `exists` / `remove` |
| 临时下载链接 | `getSignedUrl(path, expiresInSecond)` |
| 拼接配置前缀 | `service.prefix(path)` 或方法传 `{ prefix: true }` |
| 环境变量配置 | `ObjectStorageModuleConfig`(配合 `@buka/nestjs-config`) |

## 注册

```typescript
import { ObjectStorageModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    ObjectStorageModule.register({
      endpoint: 'https://s3.amazonaws.com',   // S3 兼容端点
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIA...',
      secretAccessKey: 'wJalr...',
      forcePathStyle: false,                  // MinIO/LocalStack 设 true
      prefix: 'uploads',                      // 环境/业务隔离前缀
    }),
  ],
})
export class AppModule {}
```

| 选项 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `endpoint` / `bucket` / `region` / `accessKeyId` / `secretAccessKey` | 是 | — | 连接信息 |
| `forcePathStyle` | 否 | `false` | **MinIO/LocalStack 等通常要 `true`**;AWS S3 用默认虚拟主机风格 |
| `prefix` | 否 | `''` | 对象键前缀(自动去首尾斜杠) |

配置也可走 `@buka/nestjs-config`:`@Configuration('S3') class S3Config extends ObjectStorageModuleConfig {}`,字段自带校验(`endpoint` 要求 `@IsUrl`)。S3 客户端在 `onModuleInit` 时初始化,连接信息错误会在首次操作暴露。

## Service 六个方法

```typescript
import { ObjectStorageService } from '@buka/nestjs-kit'

constructor(private readonly storage: ObjectStorageService) {}

// 下载:Readable 流,可直接 pipe 到 HTTP response
const stream = await this.storage.get('documents/report.pdf')
stream.pipe(res)

// 上传:string | Buffer | Readable(lib-storage 自动分片),返回实际对象键
await this.storage.upload('config/settings.json', JSON.stringify(config))
await this.storage.upload('images/avatar.png', imageBuffer)
await this.storage.upload('backups/data.zip', createReadStream('/path.zip'))

// 元数据 / 存在性 / 删除
await this.storage.getMetadata('documents/report.pdf')
await this.storage.exists('documents/report.pdf')
await this.storage.remove('documents/report.pdf')

// 预签名 URL:临时授权访问私有对象(秒)
const url = await this.storage.getSignedUrl('documents/report.pdf', 3600)
```

所有方法最后一个可选参数 `{ prefix: boolean }`:`true` 时先拼配置里的 `prefix`(等价手动调 `this.storage.prefix(path)`)。

## prefix 语义

prefix 分两级生效:

- **配置级** `register({ prefix: 'uploads' })`:声明隔离根目录(环境/业务域),不自动作用于任何调用
- **方法级** `{ prefix: true }`:本次调用拼上配置级前缀

约定:bucket 按环境分离(或共用),服务内路径统一 `{ prefix: true }` 调用——环境与业务域隔离都在配置一处改:

```typescript
// 配置 prefix: 'dev/app-x'(staging 换 'staging/app-x'),代码不变
await this.storage.upload(`avatars/${userId}.png`, file, { prefix: true })
// 实际键: dev/app-x/avatars/uuid.png
```

路径建议带资源类型目录(`avatars/`、`attachments/`、`exports/`)便于生命周期管理。

## 注意事项

- `exists` 的实现依赖 `getMetadata`/HeadObject 的异常判断,某些兼容服务对 404 语义不同时可能误判,必要时包一层重试
- `forcePathStyle` 忘记开启是 MinIO 联调最常见的 400 来源(AWS SDK 3.x 默认虚拟主机风格)
- 私有对象一律 `getSignedUrl` 临时授权:bucket 公开读会让任意持有 URL 的访问者绕过授权
- 大文件用流上传(分片交给 lib-storage):`readFileSync` 全量进内存会撑爆服务内存
- `get` 返回流后注意**消费或销毁**(不消费会挂起连接),错误也要 `stream.destroy()`

## 相关 skills

- [nestjs-kit-crypto](../nestjs-kit-crypto/SKILL.md) — 文件内容若敏感,先信封加密再存储