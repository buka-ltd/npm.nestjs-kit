const URN_PREFIX = 'urn:buka:'


/**
 * 统一资源名称（URN）
 *
 * 格式: urn:buka:<domain>:<resource...>
 *
 * - 概念域级: urn:buka:galaxy
 * - 资源级: urn:buka:galaxy:auth-client:galaxy:console
 *
 * domain 之后的全部段为 resource 路径（: 分隔），parser 不区分"类型"和"实例"。
 * 应用层自行约定 resource 各段的语义。
 *
 * ```ts
 * Urn.of('galaxy')                                  // → 概念域级 URN
 * Urn.of('galaxy', 'auth-client:galaxy:console')     // → 资源级 URN
 * Urn.of('galaxy', ['auth-client', 'galaxy', 'console'])
 *
 * // 或通过派生方法构建
 * Urn.of('galaxy').withResource('auth-client', 'galaxy', 'console')
 * ```
 */
export class Urn {
  private constructor(
    /** 概念域 — 资源定义权归属，通常为系统名 */
    public readonly domain: string,
    /** domain 之后的完整资源路径（: 分隔），undefined 表示概念域级 */
    public readonly resource?: string,
  ) {
    if (!/^(?:\*|[a-z][a-z0-9-]*)$/.test(domain)) {
      throw new Error(`Invalid domain: ${domain}`)
    }
    if (resource !== undefined) {
      for (const seg of resource.split(':')) {
        if (!/^(?:\*{1,2}|[a-z0-9][a-z0-9-]*)$/.test(seg)) {
          throw new Error(`Invalid resource segment: '${seg}' in '${resource}'`)
        }
      }
    }
  }

  /**
   * resource 按 `:` 拆分后的段数组
   */
  get resourceSegments(): string[] {
    return this.resource ? this.resource.split(':') : []
  }

  /**
   * 序列化为 URN 字符串
   */
  toString(): string {
    let urn = `${URN_PREFIX}${this.domain}`
    if (this.resource) urn += `:${this.resource}`
    return urn
  }

  private toSegments(): string[] {
    const segments: string[] = [this.domain]
    if (this.resource) segments.push(...this.resource.split(':'))
    return segments
  }

  /**
   * 从概念域级 URN 衍生出资源级 URN
   *
   * @throws Error 当前 URN 已有 resource 时抛出
   */
  withResource(...segments: string[]): Urn {
    if (this.resource !== undefined) {
      throw new Error(`Cannot derive resource URN from a URN that already has a resource: ${this.toString()}`)
    }
    return new Urn(this.domain, segments.join(':'))
  }

  /**
   * 类型守卫：判断是否为概念域级 URN（无 resource）
   */
  isDomainUrn(): boolean {
    return this.resource === undefined
  }

  /**
   * 根据参数创建对应层级的 URN
   */
  static of(domain: string, resource?: string | string[]): Urn {
    const r = resource === undefined
      ? undefined
      : Array.isArray(resource) ? resource.join(':') : resource
    return new Urn(domain, r)
  }

  /**
   * 从 URN 字符串解析，支持通配符 `*` 和 `**`
   *
   * - `*` 匹配恰好一个段
   * - `**` 匹配零个或多个尾部段（仅允许出现在末尾）
   *
   * @throws Error URN 格式不合法时抛出
   */
  static parse(urn: string): Urn {
    if (!urn.startsWith(URN_PREFIX)) {
      throw new Error(`Invalid URN: ${urn}`)
    }

    const parts = urn.slice(URN_PREFIX.length).split(':')
    if (parts.length === 0 || parts[0] === '') {
      throw new Error(`Invalid URN: ${urn}`)
    }

    const segments: string[] = []

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part === '**') {
        if (i !== parts.length - 1) {
          throw new Error(`Invalid URN: '**' is only allowed at the end: ${urn}`)
        }
        segments.push(part)
        break
      }
      if (part === '*' || /^[a-z0-9][a-z0-9-]*$/.test(part)) {
        segments.push(part)
      } else {
        throw new Error(`Invalid URN segment: '${part}' in ${urn}`)
      }
    }

    if (segments.length === 0) {
      throw new Error(`Invalid URN: ${urn}`)
    }

    const domain = segments[0]
    const resource = segments.length > 1 ? segments.slice(1).join(':') : undefined

    return new Urn(domain, resource)
  }

  /**
   * 判断是否匹配指定的 domain 和 resource
   *
   * 未传入的参数不参与比较。
   */
  is(domain: string, resource?: string): boolean {
    if (this.domain !== domain) return false
    if (resource !== undefined && this.resource !== resource) return false
    return true
  }

  /**
   * 判断当前 URN 是否匹配指定的 URN 模式（支持通配符）
   *
   * ```ts
   * urn.match('urn:buka:galaxy:principal:*')  // resource 以 principal: 开头
   * urn.match('urn:buka:galaxy:auth-client:**') // 任意深度的 auth-client
   * ```
   */
  match(pattern: string): boolean {
    return Urn.parse(pattern).contains(this)
  }

  /**
   * 判断当前 URN 是否包含另一个 URN
   *
   * 当前 URN 含通配符（`*` 或 `**`）时，作为集合模式判断：
   * - `*` 匹配恰好一个段
   * - `**` 匹配零个或多个尾部段（仅末尾有效）
   *
   * 当前 URN 为具体 URN（无通配符）时，仅包含自身（严格相等）。
   */
  contains(other: Urn): boolean {
    const thisSegs = this.toSegments()
    const otherSegs = other.toSegments()

    const hasDoubleWildcard = thisSegs.length > 0 && thisSegs[thisSegs.length - 1] === '**'

    if (hasDoubleWildcard) {
      const fixedSegs = thisSegs.slice(0, -1)
      if (otherSegs.length < fixedSegs.length) return false
      for (let i = 0; i < fixedSegs.length; i++) {
        if (fixedSegs[i] !== '*' && fixedSegs[i] !== otherSegs[i]) return false
      }
      return true
    }

    if (thisSegs.length !== otherSegs.length) return false
    for (let i = 0; i < thisSegs.length; i++) {
      if (thisSegs[i] !== '*' && thisSegs[i] !== otherSegs[i]) return false
    }
    return true
  }
}
