import { describe, expect, it } from '@jest/globals'
import { ErrorCategory, ErrorCode } from '@buka/error-codes'

import { ClientGateExceptions } from './client-gate.exceptions'


/** 按业务系统的 systemId 组装可读错误码 */
function readableCode(error: { category: number; moduleId: number; sequenceId: number }): string {
  return new ErrorCode({
    category: error.category,
    systemId: '0002',
    moduleId: error.moduleId,
    sequenceId: error.sequenceId,
  }).toString()
}

describe('ClientGateExceptions', () => {
  it('占用公共门禁模块 0001，类别为 FEATURE、HTTP 403', () => {
    const error = new ClientGateExceptions.EntitlementExpired([])

    expect(error.moduleId).toBe(1)
    expect(error.sequenceId).toBe(3)
    expect(error.category).toBe(ErrorCategory.FEATURE)
    expect(error.httpStatus).toBe(403)
  })

  it('六个场景的 seq 从 1 连续到 6', () => {
    const errors = [
      new ClientGateExceptions.ClientVersionRejected('1.4.0', '1.0.0', []),
      new ClientGateExceptions.EntitlementRequired([]),
      new ClientGateExceptions.EntitlementExpired([]),
      new ClientGateExceptions.Maintenance([]),
      new ClientGateExceptions.CapabilityUnavailable([]),
      new ClientGateExceptions.PlanLimitReached('slots', 10, 10, []),
    ]

    expect(errors.map((error) => error.sequenceId)).toEqual([1, 2, 3, 4, 5, 6])
    expect(errors.map((error) => readableCode(error))).toEqual([
      'F0-0002-0001-001',
      'F0-0002-0001-002',
      'F0-0002-0001-003',
      'F0-0002-0001-004',
      'F0-0002-0001-005',
      'F0-0002-0001-006',
    ])
  })

  it('版本过低：文案自解释，参数进 details', () => {
    const error = new ClientGateExceptions.ClientVersionRejected('1.4.0', '1.3.9', [
      { type: 'client_gate', minVersion: '1.4.0', currentVersion: '1.3.9', platform: 'android' },
    ])

    expect(error.message).toBe('当前版本已停止服务，请更新 App 后继续使用（最低支持 1.4.0，当前 1.3.9）')
    expect(error.details).toEqual([
      { type: 'client_gate', minVersion: '1.4.0', currentVersion: '1.3.9', platform: 'android' },
    ])
  })

  it('已达上限：资源名由调用方给出，资源标识随 details 透传', () => {
    const error = new ClientGateExceptions.PlanLimitReached('名额', 5, 5, [
      { type: 'client_gate', resource: 'slots', current: 5, max: 5 },
    ])

    expect(error.message).toBe('名额数量已达上限（5/5），请提升方案后继续操作')
    expect(error.details).toEqual([
      { type: 'client_gate', resource: 'slots', current: 5, max: 5 },
    ])
  })

  it('固定文案的门禁同样带 details', () => {
    const error = new ClientGateExceptions.Maintenance([
      { type: 'client_gate', estimatedRecoveryAt: '2026-12-01T04:00:00.000Z', notice: '数据库迁移' },
    ])

    expect(error.message).toBe('服务正在维护，请稍后重试')
    expect(error.details).toEqual([
      { type: 'client_gate', estimatedRecoveryAt: '2026-12-01T04:00:00.000Z', notice: '数据库迁移' },
    ])
  })
})
