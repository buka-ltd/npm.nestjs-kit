const URN_PREFIX = 'urn:buka:'


/**
 * 统一资源名称（URN）
 *
 * 格式: urn:buka:<domain>:<resource-type>[:<resource-id>]
 *
 * 支持三种粒度：
 * - 概念域级: urn:buka:galaxy
 * - 资源类型级: urn:buka:galaxy:principal
 * - 实例级: urn:buka:galaxy:principal:550e8400-e29b-41d4-a716-446655440000
 *
 * domain 划分原则：按资源类型的定义权归属划分，非按部署单元。
 * resource-type 第一级推荐用于 env（环境），这是一个语义约定，不强制。
 *
 * 推荐通过静态工厂方法或派生方法构建层级 URN：
 * ```ts
 * Urn.of('galaxy')                              // → DomainUrn
 * Urn.of('galaxy', 'principal')                 // → ResourceTypeUrn
 * Urn.of('galaxy', 'principal', '550e8400-...')  // → ResourceIdUrn
 *
 * // 或通过派生方法逐层构建
 * Urn.of('galaxy')
 *   .withResourceType('principal')       // → ResourceTypeUrn
 *   .withResourceId('550e8400-...')      // → ResourceIdUrn
 * ```
 */
export class Urn {
  private constructor(
    /** 概念域 — 资源类型定义权归属，通常为系统名 */
    public readonly domain: string,
    /** 资源类型，可多级。第一级推荐用于 env */
    public readonly resourceType?: string,
    /** 资源实例唯一标识 */
    public readonly resourceId?: string,
  ) {
    if (!/^(?:\*|[a-z][a-z0-9-]*)$/.test(domain)) {
      throw new Error(`Invalid domain: ${domain}`)
    }
    if (resourceType !== undefined) {
      for (const seg of resourceType.split(':')) {
        if (!/^(?:\*|[a-z][a-z0-9-]*)$/.test(seg)) {
          throw new Error(`Invalid resourceType segment: '${seg}' in '${resourceType}'`)
        }
      }
    }
    if (resourceId !== undefined && !/^(?:\*{1,2}|[a-z0-9][a-z0-9-]*)$/.test(resourceId)) {
      throw new Error(`Invalid resourceId: ${resourceId}`)
    }
  }

  /**
   * 序列化为 URN 字符串
   */
  toString(): string {
    let urn = `${URN_PREFIX}${this.domain}`
    if (this.resourceType) urn += `:${this.resourceType}`
    if (this.resourceId) urn += `:${this.resourceId}`
    return urn
  }

  /**
   * 返回 resourceType 按 `:` 拆分后的层级数组
   */
  get resourceTypeSegments(): string[] {
    return this.resourceType ? this.resourceType.split(':') : []
  }

  private toSegments(): string[] {
    const segments: string[] = [this.domain]
    if (this.resourceType) segments.push(...this.resourceType.split(':'))
    if (this.resourceId) segments.push(this.resourceId)
    return segments
  }

  /**
   * 衍生出资源类型级 URN
   *
   * @throws Error 当前 URN 已有 resourceType 时抛出
   */
  withResourceType(resourceType: string): ResourceTypeUrn {
    if (this.resourceType !== undefined) {
      throw new Error(`Cannot derive ResourceTypeUrn from a URN that already has a resourceType: ${this.toString()}`)
    }
    return new Urn(this.domain, resourceType) as ResourceTypeUrn
  }

  /**
   * 衍生出实例级 URN
   *
   * @throws Error 当前 URN 无 resourceType 或已有 resourceId 时抛出
   */
  withResourceId(resourceId: string): ResourceIdUrn {
    if (this.resourceType === undefined) {
      throw new Error(`Cannot derive ResourceIdUrn from a URN without a resourceType: ${this.toString()}`)
    }
    if (this.resourceId !== undefined) {
      throw new Error(`Cannot derive ResourceIdUrn from a URN that already has a resourceId: ${this.toString()}`)
    }
    return new Urn(this.domain, this.resourceType, resourceId) as ResourceIdUrn
  }

  /**
   * 类型守卫：判断是否为概念域级 URN
   */
  isDomainUrn(): this is DomainUrn {
    return this.resourceType === undefined
  }

  /**
   * 类型守卫：判断是否为资源类型级 URN
   */
  isResourceTypeUrn(): this is ResourceTypeUrn {
    return this.resourceType !== undefined && this.resourceId === undefined
  }

  /**
   * 类型守卫：判断是否为实例级 URN
   */
  isResourceIdUrn(): this is ResourceIdUrn {
    return this.resourceType !== undefined && this.resourceId !== undefined
  }

  /**
   * 根据参数创建对应层级的 URN
   *
   * 重载签名使返回类型随参数数量自动窄化：
   * - 仅 domain → DomainUrn
   * - domain + resourceType → ResourceTypeUrn
   * - domain + resourceType + resourceId → ResourceIdUrn
   */
  static of(domain: string): DomainUrn
  static of(domain: string, resourceType: string): ResourceTypeUrn
  static of(domain: string, resourceType: string, resourceId: string): ResourceIdUrn
  static of(domain: string, resourceType?: string, resourceId?: string): DomainUrn | ResourceTypeUrn | ResourceIdUrn {
    return new Urn(domain, resourceType, resourceId) as DomainUrn | ResourceTypeUrn | ResourceIdUrn
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
    let resourceType: string | undefined
    let resourceId: string | undefined

    const lastIsDoubleWildcard = segments[segments.length - 1] === '**'

    if (lastIsDoubleWildcard) {
      if (segments.length === 1) {
        // urn:buka:**
      } else if (segments.length === 2) {
        resourceType = segments[1] !== '**' ? segments[1] : undefined
      } else {
        resourceType = segments.slice(1, -1).join(':')
      }
      resourceId = '**'
    } else {
      if (segments.length === 2) {
        resourceType = segments[1]
      } else if (segments.length >= 3) {
        resourceType = segments.slice(1, -1).join(':')
        resourceId = segments[segments.length - 1]
      }
    }

    return new Urn(domain, resourceType, resourceId)
  }

  /**
   * 判断是否匹配指定的 domain、resourceType 和 resourceId
   *
   * 仅比较传入的参数，未传入的参数不参与比较。
   */
  is(domain: string, resourceType?: string, resourceId?: string): boolean {
    if (this.domain !== domain) return false
    if (resourceType !== undefined && this.resourceType !== resourceType) return false
    if (resourceId !== undefined && this.resourceId !== resourceId) return false
    return true
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

/**
 * 概念域级 URN — 仅含 domain，无 resourceType 和 resourceId
 *
 * 可通过 `withResourceType()` 衍生出 `ResourceTypeUrn`。
 * 禁止直接调用 `withResourceId()`（跳层派生）。
 */
export interface DomainUrn extends Urn {
  readonly resourceType: undefined
  readonly resourceId: undefined
  /** @deprecated 禁止跳层派生，请先调用 withResourceType() */
  withResourceId: never
}

/**
 * 资源类型级 URN — 含 domain 和 resourceType，无 resourceId
 *
 * 可通过 `withResourceId()` 衍生出 `ResourceIdUrn`。
 * 禁止调用 `withResourceType()`（横向衍生另一个资源类型）。
 */
export interface ResourceTypeUrn extends Urn {
  readonly resourceType: string
  readonly resourceId: undefined
  /** @deprecated 禁止横向衍生，ResourceTypeUrn 不能再衍生另一个资源类型 */
  withResourceType: never
}

/**
 * 实例级 URN — 含完整三段：domain、resourceType 和 resourceId
 *
 * 终态 URN，不可继续衍生。
 */
export interface ResourceIdUrn extends Urn {
  readonly resourceType: string
  readonly resourceId: string
  /** @deprecated 终态 URN，不可继续衍生 */
  withResourceType: never
  /** @deprecated 终态 URN，不可继续衍生 */
  withResourceId: never
}


