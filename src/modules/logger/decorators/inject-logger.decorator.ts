import { InjectPinoLogger } from 'nestjs-pino'

/**
 * 注入 Logger，自动以类名为日志上下文
 *
 * 用法：
 *   @InjectLogger()
 *   private readonly logger: Logger
 *
 * 等价于：
 *   @InjectPinoLogger(MyService.name)
 *   private readonly logger: Logger
 */
export function InjectLogger(context?: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const ctx = context || target.constructor.name
    InjectPinoLogger(ctx)(target, propertyKey, parameterIndex)
  }
}
