export interface ObjectStorageModuleOptions {
  /**
   * S3 兼容服务端点
   */
  endpoint: string

  /**
   * 存储桶名称
   */
  bucket: string

  /**
   * 区域
   */
  region: string

  /**
   * Access Key ID
   */
  accessKeyId: string

  /**
   * Secret Access Key
   */
  secretAccessKey: string

  /**
   * 是否强制使用路径风格
   * @default false
   */
  forcePathStyle?: boolean

  /**
   * 对象键前缀
   * @default ''
   */
  prefix?: string
}
