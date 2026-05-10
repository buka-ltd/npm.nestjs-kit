/**
 * LoggerModule 配置
 *
 * 与 LoggerConfig 基类字段一一对应
 */
export interface LoggerModuleOptions {
  /** 服务名称，Grafana/Loki 中按服务过滤日志 */
  serviceName?: string
  /** 运行环境，默认取 NODE_ENV */
  environment?: string
  /** 服务版本号，生产环境由 CI/CD 注入 */
  version?: string
  /** 日志级别，默认 info */
  level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  /** 开发模式——启用 pino-pretty 彩色输出 */
  pretty?: boolean
}
