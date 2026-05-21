import * as fs from 'node:fs'
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { KeqRequest } from 'keq'
import type { OpenBaoAuthResponse, OpenBaoModuleOptions, OpenBaoTokenLookupSelfResponse } from './types'
import { MODULE_OPTIONS_TOKEN } from './open-bao.module-definition'

/**
 * OpenBao Token 生命周期管理服务
 *
 * 负责：
 * - 通过配置的认证方式获取 Token
 * - 定时续期 Token（在 Token 过期前触发）
 * - 续期失败时自动重新认证
 */
@Injectable()
export class OpenBaoTokenManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenBaoTokenManager.name)

  /**
   * 用于认证操作的独立 KeqRequest 实例（不依赖动态 token 中间件）
   */
  private readonly authRequest = new KeqRequest()

  private token: string | null = null
  private renewable = false
  private leaseDuration = 0
  private renewalTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly config: OpenBaoModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.authenticate()
    this.scheduleRenewal()
  }

  onModuleDestroy(): void {
    if (this.renewalTimer) {
      clearTimeout(this.renewalTimer)
      this.renewalTimer = null
    }
  }

  /**
   * 获取当前有效的 Token
   * @throws 如果 Token 尚未获取或认证失败
   */
  getToken(): string {
    if (!this.token) {
      throw new Error('OpenBao token not available. Authentication may have failed.')
    }
    return this.token
  }

  // ─── 认证方法 ──────────────────────────────────────────────

  private async authenticate(): Promise<void> {
    const { auth } = this.config

    switch (auth.method) {
      case 'token':
        this.token = auth.token
        await this.lookupTokenInfo()
        break
      case 'userpass':
        await this.loginUserpass(auth.username, auth.password, auth.mount ?? 'userpass')
        break
      case 'approle':
        await this.loginAppRole(auth.roleId, auth.secretId, auth.mount ?? 'approle')
        break
      case 'kubernetes':
        await this.loginKubernetes(auth.role, auth.jwt, auth.tokenPath, auth.mount ?? 'kubernetes')
        break
    }

    this.logger.log(`OpenBao authentication successful (method: ${auth.method})`)
  }

  /**
   * 使用用户名密码登录
   */
  private async loginUserpass(username: string, password: string, mount: string): Promise<void> {
    const response = await this.authRequest
      .post<OpenBaoAuthResponse>(`${this.config.address}/v1/auth/${mount}/login/${username}`)
      .type('application/json')
      .send({ password })

    this.handleAuthResponse(response)
  }

  /**
   * 使用 AppRole 登录
   */
  private async loginAppRole(roleId: string, secretId: string, mount: string): Promise<void> {
    const response = await this.authRequest
      .post<OpenBaoAuthResponse>(`${this.config.address}/v1/auth/${mount}/login`)
      .type('application/json')
      .send({ role_id: roleId, secret_id: secretId })

    this.handleAuthResponse(response)
  }

  /**
   * 使用 Kubernetes ServiceAccount 登录
   */
  private async loginKubernetes(
    role: string,
    jwt?: string,
    tokenPath?: string,
    mount = 'kubernetes',
  ): Promise<void> {
    const resolvedJwt = jwt ?? fs.readFileSync(
      tokenPath ?? '/var/run/secrets/kubernetes.io/serviceaccount/token',
      'utf-8',
    ).trim()

    const response = await this.authRequest
      .post<OpenBaoAuthResponse>(`${this.config.address}/v1/auth/${mount}/login`)
      .type('application/json')
      .send({ role, jwt: resolvedJwt })

    this.handleAuthResponse(response)
  }

  /**
   * 处理认证响应，提取 Token 和续期信息
   */
  private handleAuthResponse(response: OpenBaoAuthResponse): void {
    this.token = response.auth.client_token
    this.renewable = response.auth.renewable
    this.leaseDuration = response.auth.lease_duration
  }

  /**
   * 查询当前 Token 的信息（用于 token 认证方式，获取 TTL 和续期能力）
   */
  private async lookupTokenInfo(): Promise<void> {
    try {
      const response = await this.authRequest
        .get<OpenBaoTokenLookupSelfResponse>(`${this.config.address}/v1/auth/token/lookup-self`)
        .set('X-Vault-Token', this.token!)

      this.renewable = response.data?.renewable ?? false
      this.leaseDuration = response.data?.ttl ?? 0
    } catch {
      this.logger.warn('Failed to lookup token info, assuming non-renewable static token')
      this.renewable = false
      this.leaseDuration = 0
    }
  }

  // ─── Token 续期调度 ────────────────────────────────────────

  /**
   * 根据 Token 的 TTL 和续期缓冲时间，调度下一次续期
   */
  private scheduleRenewal(): void {
    if (!this.renewable || this.leaseDuration <= 0) {
      this.logger.log('Token is not renewable or has no TTL, skipping renewal schedule')
      return
    }

    const renewBuffer = this.config.renewBufferSeconds ?? 30
    // 续期间隔上限：min(7天, TTL * 70%)，避免 setTimeout 32 位溢出和时间漂移
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const maxCheckInterval = Math.min(SEVEN_DAYS_MS, this.leaseDuration * 0.7 * 1000)
    // 在 Token 过期前 renewBuffer 秒触发续期，但不超过上限，最少 1 秒
    const renewInMs = Math.min(
      Math.max((this.leaseDuration - renewBuffer) * 1000, 1000),
      maxCheckInterval,
    )

    this.renewalTimer = setTimeout(() => {
      void this.renewToken()
    }, renewInMs)

    // 防止 timer 阻止 Node.js 进程退出
    this.renewalTimer.unref()

    this.logger.log(`Token renewal scheduled in ${renewInMs / 1000}s (TTL: ${this.leaseDuration}s, buffer: ${renewBuffer}s)`)
  }

  /**
   * 执行 Token 续期，失败时尝试重新认证
   */
  private async renewToken(): Promise<void> {
    try {
      const response = await this.authRequest
        .post<OpenBaoAuthResponse>(`${this.config.address}/v1/auth/token/renew-self`)
        .type('application/json')
        .set('X-Vault-Token', this.token!)

      this.handleAuthResponse(response)
      this.logger.log('Token renewed successfully')
      this.scheduleRenewal()
    } catch (renewError) {
      this.logger.error('Failed to renew token, attempting re-authentication', renewError)

      try {
        await this.authenticate()
        this.scheduleRenewal()
      } catch (authError) {
        this.logger.error('Re-authentication also failed, will retry in 5s', authError)
        this.renewalTimer = setTimeout(() => {
          void this.renewToken()
        }, 5000)
        this.renewalTimer.unref()
      }
    }
  }
}
