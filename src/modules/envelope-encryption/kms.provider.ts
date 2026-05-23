import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { OpenBaoHttpClient } from '../../apis/open-bao-http/open-bao-http.client'
import { MODULE_OPTIONS_TOKEN } from './envelope-encryption.module-definition'
import type { EnvelopeEncryptionModuleOptions } from './types/envelope-encryption-module-options'
import { RequestException } from 'keq'


interface KekMetadata {
  kekPath: string
  // kekActiveVersion: number
}

interface GeneratedDek {
  dek: Buffer
  encryptedDek: Buffer
  kekVersion: number
}

interface DekCacheEntry {
  dek: Buffer
  expireAt: number
}


@Injectable()
export class KmsProvider implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KmsProvider.name)

  // ----- KEK 元数据缓存 -----
  // KEK 元数据（如 Transit key 路径）在首次使用时从 OpenBao 拉取一次，并在进程生命周期内永久保留。
  // KEK 元数据在运行时是不可变的：key 名称不会变更，key 版本由 OpenBao 内部管理，
  // 因此无需设置过期或主动淘汰。
  // `loadingPromises` 用于对同一 KEK 的并发请求去重，确保同一时刻只有一个 OpenBao 请求正在等待响应。
  private kekMetadataMap: Map<string, KekMetadata> = new Map()
  private loadingPromises: Map<string, Promise<KekMetadata>> = new Map()

  // ----- DEK 明文缓存 -----
  // 每次调用 `decryptDek()` 都需要向 OpenBao Transit API 发起一次网络请求。
  // 当同一条加密 DEK 在短时间内被频繁访问时（例如解密同一条记录的多个字段），
  // 这些重复请求会显著增加延迟并加重 OpenBao 的负载。
  //
  // 为此，解密后的 DEK 明文会在内存中短暂缓存，TTL 由 `options.dekCacheTtl` 配置（默认 0 = 禁用）。
  // 缓存 key 为 base64 编码的加密 DEK，具有幂等性：同一密文必然解出同一明文。
  //
  // 安全提示：明文 DEK 保留在内存中会扩大其暴露窗口（例如堆转储时可被读取），
  // TTL 应设置为刚好能覆盖突发访问的时间范围，通常建议 30～120 秒。
  //
  // `dekDecryptingPromises` 用于对同一加密 DEK 的并发解密请求去重，确保同一时刻只有一个 OpenBao 请求正在等待响应。
  private dekCache: Map<string, DekCacheEntry> = new Map()
  private dekDecryptingPromises: Map<string, Promise<Buffer>> = new Map()
  private dekCacheCleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly openbao: OpenBaoHttpClient,
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: EnvelopeEncryptionModuleOptions,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const keks = this.options.keks ?? []
    await Promise.all(keks.map((kekId) => this.getOrLoadKekMetadata(kekId)))

    const ttl = this.options.dekCacheTtl ?? 0
    if (ttl < 0) {
      this.logger.warn(`dekCacheTtl 配置值 ${ttl}s 无效（不能为负数），已忽略缓存配置`)
    } else if (ttl > 0 && ttl < 30) {
      this.logger.warn(`dekCacheTtl 配置值 ${ttl}s 过短（建议 30～120s），缓存效果有限`)
    } else if (ttl > 120) {
      this.logger.warn(`dekCacheTtl 配置值 ${ttl}s 过长（建议 30～120s），明文 DEK 将在内存中长时间驻留，存在安全风险`)
    }

    if (ttl > 0) {
      this.dekCacheCleanupTimer = setInterval(() => this.evictExpiredDekEntries(), ttl * 1000)
    }
  }

  onModuleDestroy(): void {
    if (this.dekCacheCleanupTimer !== null) {
      clearInterval(this.dekCacheCleanupTimer)
      this.dekCacheCleanupTimer = null
    }
  }

  private getOrLoadKekMetadata(kekId: string): Promise<KekMetadata> {
    const cached = this.kekMetadataMap.get(kekId)
    if (cached) return Promise.resolve(cached)

    const loading = this.loadingPromises.get(kekId)
    if (loading) return loading

    const isPreloaded = (this.options.keks ?? []).includes(kekId)
    if (!isPreloaded) {
      this.logger.warn(`KEK "${kekId}" 未在 options.keks 中预加载，将在首次使用时动态加载。建议将高频使用的 KEK 加入预加载列表以避免启动时的冷启动延迟。`)
    }

    const promise = (async () => {
      try {
        await this.openbao.transitReadKey().params({ name: kekId })
        const metadata: KekMetadata = { kekPath: kekId }
        this.kekMetadataMap.set(kekId, metadata)
        return metadata
      } finally {
        this.loadingPromises.delete(kekId)
      }
    })()

    this.loadingPromises.set(kekId, promise)
    return promise
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateDek(kekId: string, _type: 'aes128-gcm96' | 'aes256-gcm96' | 'chacha20-poly1305'): Promise<GeneratedDek> {
    const { kekPath } = await this.getOrLoadKekMetadata(kekId)
    const dekResponse: any = await this.openbao
      .transitGenerateDataKey({ key_version: undefined })
      .params({ name: kekPath, plaintext: 'plaintext' })

    return {
      dek: Buffer.from(dekResponse.data.plaintext, 'base64'),
      encryptedDek: Buffer.from(dekResponse.data.ciphertext),
      kekVersion: dekResponse.data.key_version,
    }
  }

  async decryptDek(kekId: string, kekVersion: number, encryptedDek: Buffer): Promise<Buffer> {
    const { kekPath } = await this.getOrLoadKekMetadata(kekId)
    return this.getOrDecryptDek(kekPath, kekId, kekVersion, encryptedDek)
  }

  private getOrDecryptDek(kekPath: string, kekId: string, kekVersion: number, encryptedDek: Buffer): Promise<Buffer> {
    const ttl = this.options.dekCacheTtl ?? 0
    const cacheKey = encryptedDek.toString('base64')

    if (ttl > 0) {
      const cached = this.dekCache.get(cacheKey)
      if (cached && cached.expireAt > Date.now()) {
        return Promise.resolve(cached.dek)
      }

      const inflight = this.dekDecryptingPromises.get(cacheKey)
      if (inflight) return inflight
    }

    const promise = (async () => {
      try {
        const dekResponse: any = await this.openbao
          .transitDecrypt({ ciphertext: encryptedDek.toString() })
          .params({ name: kekPath })
          .catch(async (err) => {
            let message = `使用 KEK 解密 DEK 失败，KEK ID: ${kekId}，KEK 版本: ${kekVersion}`
            if (err instanceof RequestException && err.response) {
              const text = await err.response.text()
              message += `\nOpenBao 响应: ${text}`
            }
            this.logger.error(message, err.stack)
            throw err
          })

        const dek = Buffer.from(dekResponse.data.plaintext, 'base64')

        if (ttl > 0) {
          this.dekCache.set(cacheKey, { dek, expireAt: Date.now() + ttl * 1000 })
        }

        return dek
      } finally {
        this.dekDecryptingPromises.delete(cacheKey)
      }
    })()

    if (ttl > 0) {
      this.dekDecryptingPromises.set(cacheKey, promise)
    }

    return promise
  }

  private evictExpiredDekEntries(): void {
    const now = Date.now()
    for (const [key, entry] of this.dekCache) {
      if (entry.expireAt <= now) {
        this.dekCache.delete(key)
      }
    }
  }
}
