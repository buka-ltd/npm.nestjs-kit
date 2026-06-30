import { Logger } from '@nestjs/common'
import type { KeqMiddleware } from 'keq'
import { RequestException } from 'keq'

const logger = new Logger('ClarifyOpenbaoError')

/**
 * 根据 HTTP 状态码生成中文操作建议
 */
function getStatusCodeGuidance(statusCode: number): string {
  if (statusCode === 400) {
    return '请检查请求参数是否正确'
  }
  if (statusCode === 403) {
    return '请检查 OpenBao 策略（Policy）是否为该 Token 授予了足够的权限'
  }
  if (statusCode === 404) {
    return '请检查请求的路径或密钥是否存在'
  }
  if (statusCode >= 500) {
    return '请检查 OpenBao 服务器日志以获取更多信息'
  }
  return ''
}

/**
 * OpenBao 请求错误格式化中间件
 *
 * 必须注册在 `validateStatusCode` 之后，作为中间件链的最外层，
 * 捕获 `RequestException` 并重写其错误消息，补充请求上下文和操作建议。
 *
 * 非 RequestException 错误（网络故障、超时等）记录日志后原样透传。
 */
export function clarifyOpenbaoError(): KeqMiddleware {
  const middleware: KeqMiddleware = async (ctx, next) => {
    try {
      await next()
    } catch (err: unknown) {
      if (!(err instanceof RequestException)) {
        const method = ctx.request.method.toUpperCase()
        const url = ctx.request.url.toString()
        logger.error(
          `OpenBaoModule API 请求异常: ${method} ${url}`,
          err instanceof Error ? err.stack : undefined,
        )
        throw err
      }

      const method = ctx.request.method.toUpperCase()
      const url = ctx.request.url.toString()
      const statusCode = err.statusCode
      const statusText = err.response?.statusText ?? ''

      let message = `OpenBaoModule API 请求失败: ${method} ${url}`
      message += `\n响应状态: ${String(statusCode)} ${statusText}`

      if (err.response) {
        try {
          const bodyText = await err.response.clone().text()
          if (bodyText) {
            message += `\n响应体: ${bodyText}`
          }
        } catch {
          // 响应体读取失败（body 已被锁定等情况），跳过
        }
      }

      const guidance = getStatusCodeGuidance(
        typeof statusCode === 'number' ? statusCode : parseInt(String(statusCode), 10),
      )
      if (guidance) {
        message += `\n建议: ${guidance}`
      }

      err.message = message
      throw err
    }
  }

  middleware.__keqMiddlewareName__ = 'clarifyOpenbaoError'
  return middleware
}
