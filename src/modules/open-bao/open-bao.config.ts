import { IsIn, IsNumber, IsObject, IsOptional, IsString, IsUrl, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import type { OpenBaoModuleOptions } from './types/open-bao-module-options'
import type {
  OpenBaoAuthMethod,
  OpenBaoTokenAuth,
  OpenBaoUserpassAuth,
  OpenBaoAppRoleAuth,
  OpenBaoKubernetesAuth,
} from './types/open-bao-auth.types'


export class OpenBaoTokenAuthConfig implements OpenBaoTokenAuth {
  @IsIn(['token'])
  method = <const>'token'

  @IsString()
  token!: string
}

export class OpenBaoUserpassAuthConfig implements OpenBaoUserpassAuth {
  @IsIn(['userpass'])
  method = <const>'userpass'

  @IsString()
  username!: string

  @IsString()
  password!: string

  @IsString()
  @IsOptional()
  mount?: string
}

export class OpenBaoAppRoleAuthConfig implements OpenBaoAppRoleAuth {
  @IsIn(['approle'])
  method = <const>'approle'

  @IsString()
  roleId!: string

  @IsString()
  secretId!: string

  @IsString()
  @IsOptional()
  mount?: string
}

export class OpenBaoKubernetesAuthConfig implements OpenBaoKubernetesAuth {
  @IsIn(['kubernetes'])
  method = <const>'kubernetes'

  @IsString()
  role!: string

  @IsString()
  @IsOptional()
  jwt?: string

  @IsString()
  @IsOptional()
  tokenPath?: string

  @IsString()
  @IsOptional()
  mount?: string
}


export class OpenBaoModuleConfig implements OpenBaoModuleOptions {
  /**
   * OpenBao 服务器地址
   */
  @IsUrl({ require_tld: false })
  address: string = 'http://localhost:8200'

  /**
   * 身份认证配置
   */
  @IsObject()
  // TODO:
  // @ValidateNested()
  // @Type(() => Object, {
  //   keepDiscriminatorProperty: true,
  //   discriminator: {
  //     property: 'method',
  //     subTypes: [
  //       { value: OpenBaoTokenAuthConfig, name: 'token' },
  //       { value: OpenBaoUserpassAuthConfig, name: 'userpass' },
  //       { value: OpenBaoAppRoleAuthConfig, name: 'approle' },
  //       { value: OpenBaoKubernetesAuthConfig, name: 'kubernetes' },
  //     ],
  //   },
  // })
  auth!: OpenBaoAuthMethod

  /**
   * Transit 引擎挂载路径
   */
  @IsString()
  @IsOptional()
  transitMount?: string = 'transit'

  /**
   * Token 续期提前量（秒）
   */
  @IsNumber()
  @Min(0)
  @IsOptional()
  renewBufferSeconds?: number = 30
}
