import { DynamicModule, Global, Module } from '@nestjs/common'
import { LoggerModule as PinoLoggerModule, LoggerErrorInterceptor, Params } from 'nestjs-pino'
import type { IncomingMessage, ServerResponse } from 'http'
import { stdSerializers } from 'pino'
import { LoggerModuleOptions } from './types/logger-module-options'

/**
 * 统一日志模块
 *
 * 基于 nestjs-pino，预配置 Grafana/Loki 友好的 JSON 日志格式。
 *
 * @example
 *   // 直接使用
 *   LoggerModule.register({ serviceName: 'my-service' })
 *
 *   // 配合 @buka/nestjs-config
 *   ConfigModule.inject(PinoConfig, LoggerModule, (config) => ({...config}))
 */
@Global()
@Module({})
export class LoggerModule {
  static register(options: LoggerModuleOptions = {}): DynamicModule {
    return {
      module: LoggerModule,
      imports: [PinoLoggerModule.forRoot(this.buildParams(options))],
      providers: [LoggerErrorInterceptor],
      exports: [PinoLoggerModule, LoggerErrorInterceptor],
    }
  }

  static registerAsync(options: {
    imports?: any[]
    inject?: any[]
    useFactory: (...args: any[]) => LoggerModuleOptions | Promise<LoggerModuleOptions>
  }): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        ...(options.imports || []),
        PinoLoggerModule.forRootAsync({
          imports: options.imports || [],
          inject: options.inject || [],
          useFactory: async (...args: any[]) => {
            const opts: LoggerModuleOptions = await options.useFactory(...args)
            return LoggerModule.buildParams(opts)
          },
        }),
      ],
      providers: [LoggerErrorInterceptor],
      exports: [PinoLoggerModule, LoggerErrorInterceptor],
    }
  }

  /**
   * 将 LoggerModuleOptions 转换为 nestjs-pino 的 Params
   */
  private static buildParams(options: LoggerModuleOptions): Params {
    const {
      serviceName = 'unknown',
      environment = process.env.NODE_ENV || 'development',
      version = '0.0.0',
      level = 'info',
      pretty = false,
    } = options

    return {
      pinoHttp: {
        // 开发环境 pino-pretty，生产环境无 transport = 原生 JSON（最优 Loki 输入）
        ...(pretty
          ? { transport: { target: 'pino-pretty' } }
          : {}),

        level,

        // 请求 ID：优先上游 X-Request-Id，否则 crypto.randomUUID()
        genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string)
          || crypto.randomUUID(),

        autoLogging: options.autoLogging,

        customAttributeKeys: {
          reqId: 'reqId',
          responseTime: 'responseTime',
        },

        serializers: {
          req: (req: IncomingMessage) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: ServerResponse) => ({
            statusCode: res.statusCode,
          }),
          err: stdSerializers.err,
        },

        formatters: {
          // 数字 level → 字符串标签，Loki 可直接 {level="error"}
          level: (label: string) => ({ level: label }),
          // 向每行日志注入服务元数据
          bindings: (bindings: Record<string, unknown>) => ({
            ...bindings,
            service: serviceName,
            environment,
            version,
          }),
        },
      },
    }
  }
}
