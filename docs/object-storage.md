# ObjectStorageModule — 对象存储模块

## 概述

`ObjectStorageModule` 提供 S3 兼容的对象存储客户端，基于 `@aws-sdk/client-s3` 构建。支持文件上传/下载、元数据查询、存在性检查、删除和签名 URL 生成。

```typescript
import { ObjectStorageModule, ObjectStorageService } from '@buka/nestjs-kit'
```

## 模块配置

使用 NestJS `ConfigurableModuleBuilder` 模式注册：

```typescript
import { Module } from '@nestjs/common'
import { ObjectStorageModule } from '@buka/nestjs-kit'

@Module({
  imports: [
    ObjectStorageModule.register({
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      forcePathStyle: false,
      prefix: 'uploads',
    }),
  ],
})
export class AppModule {}
```

### 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `endpoint` | `string` | 是 | — | S3 兼容服务端点 |
| `bucket` | `string` | 是 | — | 存储桶名称 |
| `region` | `string` | 是 | — | 区域 |
| `accessKeyId` | `string` | 是 | — | Access Key ID |
| `secretAccessKey` | `string` | 是 | — | Secret Access Key |
| `forcePathStyle` | `boolean` | 否 | `false` | 是否强制使用路径风格（MinIO 等兼容服务通常需要设为 `true`） |
| `prefix` | `string` | 否 | `''` | 对象键前缀，用于在同一 Bucket 下隔离不同环境或模块的数据 |

## ObjectStorageService

### get

下载对象，返回可读流。

```typescript
async get(path: string, options?: ObjectStorageOptions): Promise<Readable>
```

```typescript
import { Readable } from 'node:stream'

const stream: Readable = await storageService.get('documents/report.pdf')

// 流式读取
stream.pipe(res) // 直接管道到 HTTP 响应
```

### upload

上传对象，支持字符串、Buffer 和可读流。基于 `@aws-sdk/lib-storage` 的 `Upload` 实现，自动处理分片上传。

```typescript
async upload(path: string, contents: string | Readable | Buffer, options?: ObjectStorageOptions): Promise<string>
```

返回实际写入的对象键（可能包含 prefix）。

```typescript
// 上传字符串
await storageService.upload('config/settings.json', JSON.stringify(config))

// 上传 Buffer
await storageService.upload('images/avatar.png', imageBuffer)

// 流式上传
import { createReadStream } from 'node:fs'
const stream = createReadStream('/path/to/large-file.zip')
await storageService.upload('backups/data.zip', stream)
```

### getMetadata

获取对象的元数据。

```typescript
async getMetadata(path: string, options?: ObjectStorageOptions): Promise<Record<string, string>>
```

### exists

检查对象是否存在。

```typescript
async exists(path: string, options?: ObjectStorageOptions): Promise<boolean>
```

```typescript
const fileExists = await storageService.exists('documents/report.pdf')
if (!fileExists) {
  // 文件不存在
}
```

### remove

删除对象。

```typescript
async remove(path: string, options?: ObjectStorageOptions): Promise<void>
```

### getSignedUrl

生成预签名 URL，用于临时授权访问私有对象。

```typescript
async getSignedUrl(path: string, expiresInSecond: number, options?: ObjectStorageOptions): Promise<string>
```

```typescript
// 生成 1 小时有效期的下载链接
const url = await storageService.getSignedUrl('documents/report.pdf', 3600)
```

### prefix

手动拼接 prefix 路径。

```typescript
prefix(path: string): string
```

```typescript
const fullPath = storageService.prefix('documents/report.pdf')
// → "uploads/documents/report.pdf"（假设配置了 prefix: 'uploads'）
```

## ObjectStorageOptions

所有方法的可选参数：

| 字段 | 类型 | 说明 |
|------|------|------|
| `prefix` | `boolean` | 是否自动拼接模块配置的 `prefix`。设为 `true` 时调用 `prefix()` 方法处理路径 |

## 完整使用示例

```typescript
import { Injectable } from '@nestjs/common'
import { ObjectStorageService } from '@buka/nestjs-kit'
import { Readable } from 'node:stream'

@Injectable()
export class FileService {
  constructor(private readonly storage: ObjectStorageService) {}

  async uploadAvatar(userId: string, file: Buffer): Promise<string> {
    const path = `avatars/${userId}.png`
    return this.storage.upload(path, file, { prefix: true })
  }

  async getAvatar(userId: string): Promise<Readable> {
    const path = `avatars/${userId}.png`
    return this.storage.get(path, { prefix: true })
  }

  async getAvatarUrl(userId: string): Promise<string> {
    const path = `avatars/${userId}.png`
    return this.storage.getSignedUrl(path, 3600, { prefix: true })
  }

  async deleteAvatar(userId: string): Promise<void> {
    const path = `avatars/${userId}.png`
    await this.storage.remove(path, { prefix: true })
  }
}
```

## 注意事项

> S3 客户端在 `onModuleInit` 时初始化。确保配置的 `endpoint`、`accessKeyId` 和 `secretAccessKey` 正确，否则后续操作会失败。

> `forcePathStyle: true` 适用于 MinIO、LocalStack 等 S3 兼容服务。AWS S3 通常使用虚拟主机风格（默认 `false`）。

> `prefix` 配置会自动去除首尾斜杠后拼接。例如 prefix 为 `/uploads/` 时，`prefix('docs/a.pdf')` 返回 `uploads/docs/a.pdf`。
