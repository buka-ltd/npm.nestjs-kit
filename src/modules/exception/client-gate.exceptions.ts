import type { ExceptionDetail } from '@buka/exception'

import { ModuleExceptions } from './decorators/exception-module.decorator.js'
import { FeatureException } from './pending-exception.factory.js'


/** 门禁详情的基础形态 */
export interface ClientGateDetail extends ExceptionDetail {
  /** 详情类型；门禁固定为 `client_gate` */
  readonly type: 'client_gate'
}

/** 客户端版本过低 */
export interface ClientVersionRejectedDetail extends ClientGateDetail {
  readonly minVersion: string
  readonly currentVersion: string
  readonly platform: string
}

/** 缺少或失去付费资格 */
export interface EntitlementDetail extends ClientGateDetail {
  readonly planCode?: string
  readonly expiresAt?: string
}

/** 计划内维护 */
export interface MaintenanceDetail extends ClientGateDetail {
  readonly estimatedRecoveryAt?: string
  readonly notice?: string
}

/** 功能未开放 */
export interface CapabilityUnavailableDetail extends ClientGateDetail {
  readonly capability?: string
}

/** 已达当前方案上限 */
export interface PlanLimitDetail extends ClientGateDetail {
  /** 触碰上限的资源标识，取值由调用方定义 */
  readonly resource: string
  /** 当前数量 */
  readonly current: number
  /** 方案允许的上限 */
  readonly max: number
}


/**
 * 客户端门禁（moduleId: 1）
 *
 * 公共/基础设施号段的「客户端门禁」模块：表示用户当前做不了某件事，且必须完成
 * 一个固定动作才能恢复。占用公共号段意味着任何系统都可抛出，它不是某个系统的业务语义。
 *
 * - 类别恒为 `FEATURE`（HTTP 403）；
 * - 参数走 `details`（调用时作为最后一个参数传入详情数组），详情以 `type: 'client_gate'` 标识。
 *
 * @example
 * ```typescript
 * throw new ClientGateExceptions.PlanLimitReached('成员', 15, 10, [
 *   { type: 'client_gate', resource: 'members', current: 15, max: 10 },
 * ])
 * ```
 */
@ModuleExceptions({ moduleId: 1 })
export class ClientGateExceptions {
  /**
   * 客户端版本过低
   *
   * 客户端应展示不可关闭的全屏阻断页，并引导更新。
   */
  static readonly ClientVersionRejected = FeatureException({
    sequenceId: 1,
    messageFactory: (minVersion: string, currentVersion: string) => `当前版本已停止服务，请更新 App 后继续使用（最低支持 ${minVersion}，当前 ${currentVersion}）`,
    description: '客户端版本低于服务端声明的最低支持版本；需要更新客户端后才能继续使用',
  })

  /**
   * 需要付费资格
   *
   * 用于仅对付费方案开放的专属能力；免费方案本就合法的情况用「已达当前方案上限」。
   */
  static readonly EntitlementRequired = FeatureException({
    sequenceId: 2,
    messageFactory: () => '该功能需要开通付费方案后使用',
    description: '缺少使用该能力所需的付费资格；需要开通付费方案',
  })

  /**
   * 付费资格已失效
   *
   * 到期后按软降级处理：存量数据可读可改可删，只在触发受限动作时阻断。
   */
  static readonly EntitlementExpired = FeatureException({
    sequenceId: 3,
    messageFactory: () => '付费方案已失效，请续费后继续使用',
    description: '付费方案已过期；需要续费，存量数据不受影响',
  })

  /**
   * 服务维护中
   *
   * 维护的主通道是客户端启动时拉取维护窗口（后端在维护中往往不可用），本码只在前端漏判时兜底。
   */
  static readonly Maintenance = FeatureException({
    sequenceId: 4,
    messageFactory: () => '服务正在维护，请稍后重试',
    description: '服务处于计划内维护窗口；客户端应展示阻断页并自动重试',
  })

  /**
   * 功能未开放
   *
   * 客户端版本已满足要求，但该能力在当前配置下未开启（按版本关闭、灰度等）。
   */
  static readonly CapabilityUnavailable = FeatureException({
    sequenceId: 5,
    messageFactory: () => '该功能暂未开放',
    description: '能力在当前版本或配置下未开启；用户无需做任何操作',
  })

  /**
   * 已达当前方案上限
   *
   * 资源名与资源标识都由调用方给出：库只提供文案模板，不持有任何产品的资源词汇。
   */
  static readonly PlanLimitReached = FeatureException({
    sequenceId: 6,
    messageFactory: (resourceLabel: string, current: number, max: number) => `${resourceLabel}数量已达上限（${current}/${max}），请提升方案后继续操作`,
    description: '资源数量达到当前方案上限；需要提升方案或清理存量',
  })
}
