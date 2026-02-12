import type { ErrorCategory } from '@buka/error-codes'

interface ExceptionMeta {
  category: ErrorCategory
  moduleId: number
  sequenceId: number
}

/**
 * 错误码注册中心
 *
 * 负责:
 * 1. 管理 systemId (全局唯一，由业务系统配置一次)
 * 2. 校验 moduleId 唯一性 (每个 moduleId 只能被一个模块使用)
 * 3. 校验错误码唯一性 (category + moduleId + sequenceId)
 */
export class ErrorCodeRegistry {
  private static instance: ErrorCodeRegistry
  private systemId: number | null = null
  private readonly codeKeys = new Map<string, string>()
  private readonly descriptions = new Map<string, string>()
  private readonly moduleIds = new Map<number, string>()

  private constructor() {}

  static getInstance(): ErrorCodeRegistry {
    if (!ErrorCodeRegistry.instance) {
      ErrorCodeRegistry.instance = new ErrorCodeRegistry()
    }
    return ErrorCodeRegistry.instance
  }

  /**
   * 配置系统ID
   * @param systemId 系统ID (0 - 1048575)
   */
  setSystemId(systemId: number): void {
    if (this.systemId !== null && this.systemId !== systemId) {
      throw new Error(
        `System ID already set to ${this.systemId}, cannot change to ${systemId}`,
      )
    }
    if (systemId < 0 || systemId >= 2 ** 20) {
      throw new Error(`System ID must be between 0 and ${2 ** 20 - 1}, got ${systemId}`)
    }
    this.systemId = systemId
  }

  /**
   * 获取系统ID
   */
  getSystemId(): number {
    if (this.systemId === null) {
      throw new Error(
        'System ID not configured. Call ExceptionModule.register({ systemId }) first.',
      )
    }
    return this.systemId
  }

  /**
   * 检查系统ID是否已配置
   */
  hasSystemId(): boolean {
    return this.systemId !== null
  }

  /**
   * 注册模块ID
   * @param moduleId 模块ID
   * @param moduleName 模块名称 (用于错误提示)
   */
  registerModule(moduleId: number, moduleName: string): void {
    const existing = this.moduleIds.get(moduleId)
    if (existing && existing !== moduleName) {
      throw new Error(
        `Duplicate module ID [${moduleId}]:\n`
        + `  Existing: ${existing}\n`
        + `  New: ${moduleName}\n`
        + 'Each module must have a unique moduleId.',
      )
    }
    this.moduleIds.set(moduleId, moduleName)
  }

  /**
   * 获取模块名称
   * @param moduleId 模块ID
   */
  getModuleName(moduleId: number): string | undefined {
    return this.moduleIds.get(moduleId)
  }

  /**
   * 获取所有已注册的模块
   */
  getAllRegisteredModules(): Map<number, string> {
    return new Map(this.moduleIds)
  }

  /**
   * 注册错误码
   * @param meta 错误码元信息
   * @param className 异常类名 (用于错误提示)
   * @param description 错误描述 (用于错误码查询接口)
   */
  register(meta: ExceptionMeta, className: string, description?: string): void {
    // 校验 moduleId 是否已注册
    const moduleName = this.moduleIds.get(meta.moduleId)
    if (!moduleName) {
      throw new Error(
        `Module ID [${meta.moduleId}] not registered.\n`
        + `Please call ErrorCodeRegistry.getInstance().registerModule(${meta.moduleId}, 'YourModuleName') first.\n`
        + 'Or use createExceptionModule() to create module-scoped exception factories.',
      )
    }

    const key = `${meta.category}-${meta.moduleId}-${meta.sequenceId}`

    const existing = this.codeKeys.get(key)
    if (existing) {
      throw new Error(
        `Duplicate error code [${key}]:\n`
        + `  Existing: ${existing}\n`
        + `  New: ${className}\n`
        + 'Each error code (category + moduleId + sequenceId) must be unique.',
      )
    }

    this.codeKeys.set(key, className)
    if (description !== undefined) {
      this.descriptions.set(key, description)
    }
  }

  /**
   * 获取错误码描述
   * @param key 错误码 key (category-moduleId-sequenceId)
   */
  getDescription(key: string): string | undefined {
    return this.descriptions.get(key)
  }

  /**
   * 获取所有已注册的错误码
   */
  getAllRegisteredCodes(): Map<string, string> {
    return new Map(this.codeKeys)
  }

  /**
   * 清空注册 (仅用于测试)
   */
  clear(): void {
    this.systemId = null
    this.codeKeys.clear()
    this.descriptions.clear()
    this.moduleIds.clear()
  }
}
