const URN_PREFIX = 'urn:buka:'
const URN_PATTERN = /^urn:buka:([a-z][a-z0-9-]*)(?::([a-z][a-z0-9-]*)(?::(.+))?)?$/


/**
 * 统一资源名称（URN）
 *
 * 格式: urn:buka:<namespace>[:<resource>[:<identifier>]]
 *
 * 支持三种粒度：
 * - namespace 级: urn:buka:galaxy
 * - 资源类型级: urn:buka:galaxy:principal
 * - 实例级: urn:buka:galaxy:principal:550e8400-e29b-41d4-a716-446655440000
 *
 * namespace 划分原则：按资源类型的定义权归属划分，非按部署单元。
 *
 * 推荐通过静态工厂方法或派生方法构建层级 URN：
 * ```ts
 * Urn.of('galaxy')                              // → NamespaceUrn
 * Urn.of('galaxy', 'principal')                 // → ResourceUrn
 * Urn.of('galaxy', 'principal', '550e8400-...')  // → IdentifierUrn
 *
 * // 或通过派生方法逐层构建
 * Urn.of('galaxy')
 *   .withResource('principal')       // → ResourceUrn
 *   .withIdentifier('550e8400-...')  // → IdentifierUrn
 * ```
 */
export class Urn {
  private constructor(
    /** 资源类型所有者（概念域/平台），如 galaxy、infra */
    public readonly namespace: string,
    /** 资源类型，如 principal、oauth2-client */
    public readonly resource?: string,
    /** 资源唯一标识 */
    public readonly identifier?: string,
  ) {}

  /**
   * 序列化为 URN 字符串
   */
  toString(): string {
    let urn = `${URN_PREFIX}${this.namespace}`
    if (this.resource) urn += `:${this.resource}`
    if (this.identifier) urn += `:${this.identifier}`
    return urn
  }

  /**
   * 衍生出资源类型级 URN
   *
   * @throws Error 当前 URN 已有 resource 时抛出
   */
  withResource(resource: string): ResourceUrn {
    if (this.resource !== undefined) {
      throw new Error(`Cannot derive ResourceUrn from a URN that already has a resource: ${this.toString()}`)
    }
    return new Urn(this.namespace, resource) as ResourceUrn
  }

  /**
   * 衍生出实例级 URN
   *
   * @throws Error 当前 URN 无 resource 或已有 identifier 时抛出
   */
  withIdentifier(identifier: string): IdentifierUrn {
    if (this.resource === undefined) {
      throw new Error(`Cannot derive IdentifierUrn from a URN without a resource: ${this.toString()}`)
    }
    if (this.identifier !== undefined) {
      throw new Error(`Cannot derive IdentifierUrn from a URN that already has an identifier: ${this.toString()}`)
    }
    return new Urn(this.namespace, this.resource, identifier) as IdentifierUrn
  }

  /**
   * 类型守卫：判断是否为 namespace 级 URN
   */
  isNamespaceUrn(): this is NamespaceUrn {
    return this.resource === undefined
  }

  /**
   * 类型守卫：判断是否为资源类型级 URN
   */
  isResourceUrn(): this is ResourceUrn {
    return this.resource !== undefined && this.identifier === undefined
  }

  /**
   * 类型守卫：判断是否为实例级 URN
   */
  isIdentifierUrn(): this is IdentifierUrn {
    return this.resource !== undefined && this.identifier !== undefined
  }

  /**
   * 根据参数创建对应层级的 URN
   *
   * 重载签名使返回类型随参数数量自动窄化：
   * - 仅 namespace → NamespaceUrn
   * - namespace + resource → ResourceUrn
   * - namespace + resource + identifier → IdentifierUrn
   */
  static of(namespace: string): NamespaceUrn
  static of(namespace: string, resource: string): ResourceUrn
  static of(namespace: string, resource: string, identifier: string): IdentifierUrn
  static of(namespace: string, resource?: string, identifier?: string): NamespaceUrn | ResourceUrn | IdentifierUrn {
    return new Urn(namespace, resource, identifier) as NamespaceUrn | ResourceUrn | IdentifierUrn
  }

  /**
   * 从 URN 字符串解析
   *
   * @throws Error URN 格式不合法时抛出
   */
  static parse(urn: string): Urn {
    const match = urn.match(URN_PATTERN)
    if (!match) {
      throw new Error(`Invalid URN: ${urn}`)
    }
    return new Urn(match[1], match[2], match[3])
  }

  /**
   * 判断是否匹配指定的 namespace、resource 和 identifier
   *
   * 仅比较传入的参数，未传入的参数不参与比较。
   */
  is(namespace: string, resource?: string, identifier?: string): boolean {
    if (this.namespace !== namespace) return false
    if (resource !== undefined && this.resource !== resource) return false
    if (identifier !== undefined && this.identifier !== identifier) return false
    return true
  }
}

/**
 * namespace 级 URN — 仅含 namespace，无 resource 和 identifier
 *
 * 可通过 `withResource()` 衍生出 `ResourceUrn`。
 * 禁止直接调用 `withIdentifier()`（跳层派生）。
 */
export interface NamespaceUrn extends Urn {
  readonly resource: undefined
  readonly identifier: undefined
  /** @deprecated 禁止跳层派生，请先调用 withResource() */
  withIdentifier: never
}

/**
 * 资源类型级 URN — 含 namespace 和 resource，无 identifier
 *
 * 可通过 `withIdentifier()` 衍生出 `IdentifierUrn`。
 * 禁止调用 `withResource()`（横向衍生另一个资源类型）。
 */
export interface ResourceUrn extends Urn {
  readonly resource: string
  readonly identifier: undefined
  /** @deprecated 禁止横向衍生，ResourceUrn 不能再衍生另一个资源类型 */
  withResource: never
}

/**
 * 实例级 URN — 含完整三段：namespace、resource 和 identifier
 *
 * 终态 URN，不可继续衍生。
 */
export interface IdentifierUrn extends Urn {
  readonly resource: string
  readonly identifier: string
  /** @deprecated 终态 URN，不可继续衍生 */
  withResource: never
  /** @deprecated 终态 URN，不可继续衍生 */
  withIdentifier: never
}
