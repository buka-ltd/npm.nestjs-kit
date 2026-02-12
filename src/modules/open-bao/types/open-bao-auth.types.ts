/**
 * 直接使用 Token 进行认证
 */
export interface OpenBaoTokenAuth {
  method: 'token'
  /** OpenBao 认证令牌 */
  token: string
}

/**
 * 使用用户名密码进行认证
 */
export interface OpenBaoUserpassAuth {
  method: 'userpass'
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 认证引擎挂载路径，默认 'userpass' */
  mount?: string
}

/**
 * 使用 AppRole 进行认证
 */
export interface OpenBaoAppRoleAuth {
  method: 'approle'
  /** AppRole 的 Role ID */
  roleId: string
  /** AppRole 的 Secret ID */
  secretId: string
  /** 认证引擎挂载路径，默认 'approle' */
  mount?: string
}

/**
 * 使用 Kubernetes ServiceAccount 进行认证
 */
export interface OpenBaoKubernetesAuth {
  method: 'kubernetes'
  /** Kubernetes 角色名称 */
  role: string
  /** JWT 令牌，如不提供则从 tokenPath 读取 */
  jwt?: string
  /** ServiceAccount Token 文件路径，默认 '/var/run/secrets/kubernetes.io/serviceaccount/token' */
  tokenPath?: string
  /** 认证引擎挂载路径，默认 'kubernetes' */
  mount?: string
}

/**
 * OpenBao 认证方式联合类型
 */
export type OpenBaoAuthMethod
  = OpenBaoTokenAuth
    | OpenBaoUserpassAuth
    | OpenBaoAppRoleAuth
    | OpenBaoKubernetesAuth

/**
 * OpenBao 认证响应（Vault/OpenBao 登录 API 的通用返回结构）
 */
export interface OpenBaoAuthResponse {
  auth: {
    client_token: string
    accessor: string
    policies: string[]
    token_policies: string[]
    metadata: Record<string, string>
    lease_duration: number
    renewable: boolean
  }
}

/**
 * OpenBao Token Lookup Self 响应
 */
export interface OpenBaoTokenLookupSelfResponse {
  data: {
    accessor?: string
    creation_time?: number
    creation_ttl?: number
    display_name?: string
    entity_id?: string
    expire_time?: string
    explicit_max_ttl?: number
    id?: string
    issue_time?: string
    last_renewal?: string
    last_renewal_time?: number
    meta?: Record<string, string>
    num_uses?: number
    orphan?: boolean
    path?: string
    period?: number
    policies?: string[]
    renewable?: boolean
    ttl?: number
    type?: string
  }
}
