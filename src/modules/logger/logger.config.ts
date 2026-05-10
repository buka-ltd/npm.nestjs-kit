import { ToBoolean } from '@buka/class-transformer-extra'
import { IsIn } from 'class-validator'

/**
 * 日志配置基类
 *
 * 项目中的日志配置应继承此类并通过 @Configuration('xxx') 绑定环境变量前缀
 */
export class LoggerConfig {
  @ToBoolean()
  pretty: boolean = false

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
  level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' = 'info'

  serviceName: string = 'unknown'

  environment: string = process.env.NODE_ENV || 'development'

  version: string = process.env.npm_package_version || '0.0.0'
}
