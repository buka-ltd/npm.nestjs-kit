import { IsBoolean, IsString, IsUrl } from 'class-validator'
import { ObjectStorageModuleOptions } from './types'


export class ObjectStorageModuleConfig implements ObjectStorageModuleOptions {
  @IsUrl({ require_protocol: true, disallow_auth: true })
  endpoint!: string

  @IsString()
  bucket!: string

  @IsString()
  region!: string

  @IsString()
  accessKeyId!: string

  @IsString()
  secretAccessKey!: string

  @IsBoolean()
  forcePathStyle: boolean = false

  @IsString()
  prefix: string = ''
}
