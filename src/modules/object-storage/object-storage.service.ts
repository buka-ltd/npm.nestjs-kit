import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'
import type { ObjectStorageModuleOptions, ObjectStorageOptions } from './types'
import { MODULE_OPTIONS_TOKEN } from './object-storage.module-definition'
import { Readable } from 'node:stream'


/**
 * 对象存储服务，基于 AWS S3 兼容协议提供文件的上传、下载、删除等操作。
 *
 * 支持配置路径前缀（`prefix`）以实现多租户或环境隔离。
 *
 * @example
 * ```typescript
 * // 上传文件
 * const key = await objectStorageService.upload('avatars/user-001.png', fileBuffer)
 *
 * // 获取签名 URL
 * const url = await objectStorageService.getSignedUrl('avatars/user-001.png', 3600)
 * ```
 */
@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name)

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly config: ObjectStorageModuleOptions,
  ) {}

  private client!: S3Client

  async onModuleInit(): Promise<void> {
    this.client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
    })
  }

  private trimSlashes(str: string): string {
    return str.replace(/^\/+|\/+$/g, '')
  }

  /**
   * 为路径添加配置的前缀。
   */
  prefix(path: string): string {
    const prefix = this.trimSlashes(this.config.prefix ?? '')
    if (!prefix) return path
    const p = this.trimSlashes(path)
    return `${prefix}/${p}`
  }

  private buildPath(path: string, options?: ObjectStorageOptions): string {
    return !options?.prefix ? path : this.prefix(path)
  }

  /**
   * 获取文件内容，返回可读流。
   *
   * @param path - 文件路径
   * @param options - 可选配置，如是否自动添加前缀
   */
  async get(path: string, options?: ObjectStorageOptions): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: this.buildPath(path, options),
    })

    const res = await this.client.send(command)

    if (!res.Body) {
      throw new Error('No body')
    }

    return Readable.fromWeb(res.Body.transformToWebStream() as any)
  }

  /**
   * 上传文件内容到指定路径。
   *
   * @param path - 目标文件路径
   * @param contents - 文件内容，支持字符串、Buffer 或可读流
   * @param options - 可选配置
   * @returns 实际存储的 key
   */
  async upload(path: string, contents: string | Readable | Buffer, options?: ObjectStorageOptions): Promise<string> {
    const key = this.buildPath(path, options)

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: key,
        Body: contents,
      },
    })

    await upload.done()
    return key
  }

  /**
   * 获取文件的元数据（metadata）。
   */
  async getMetadata(path: string, options?: ObjectStorageOptions): Promise<Record<string, string>> {
    const command = new HeadObjectCommand({
      Bucket: this.config.bucket,
      Key: this.buildPath(path, options),
    })

    const res = await this.client.send(command)

    if (!res.Metadata) {
      throw new Error('No metadata')
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return res.Metadata
  }

  /**
   * 检查文件是否存在。
   */
  async exists(path: string, options?: ObjectStorageOptions): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.config.bucket,
      Key: this.buildPath(path, options),
    })

    try {
      await this.client.send(command)
      return true
    } catch (err) {
      if (err instanceof Error && err.name === 'NotFound') return false
      throw err
    }
  }

  /**
   * 删除指定路径的文件。
   */
  async remove(path: string, options?: ObjectStorageOptions): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: this.buildPath(path, options),
    })

    await this.client.send(command)
  }

  /**
   * 获取文件的预签名 URL，用于临时授权访问。
   *
   * @param path - 文件路径
   * @param expiresInSecond - URL 有效期（秒）
   * @param options - 可选配置
   */
  async getSignedUrl(path: string, expiresInSecond: number, options?: ObjectStorageOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: this.buildPath(path, options),
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await getSignedUrl(this.client, command, { expiresIn: expiresInSecond })
  }
}
