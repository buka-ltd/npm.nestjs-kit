import { createParamDecorator, ExecutionContext } from '@nestjs/common'


/**
 * 参数装饰器，通过检测请求头中是否存在 `Sec-Fetch-*` 系列头，
 * 判断请求是否来自浏览器。
 *
 * 浏览器在发起请求时会自动附加 `Sec-Fetch-Site`、`Sec-Fetch-Mode`、
 * `Sec-Fetch-Dest` 等头（[Fetch Metadata Request Headers](https://www.w3.org/TR/fetch-metadata/)），
 * 非浏览器客户端（如 curl、Postman、服务端调用）通常不会携带这些头。
 *
 * 装饰的参数类型应为 `boolean`。
 *
 * @example
 * ```typescript
 * @Controller('users')
 * class UserController {
 *   @Get('me')
 *   getMe(@IsBrowserRequest() isBrowser: boolean) {
 *     if (isBrowser) {
 *       // 浏览器请求，可返回完整的页面数据
 *     }
 *   }
 * }
 * ```
 */
export const IsBrowserRequest = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, unknown> }>()
    return Object.keys(request.headers).some((key) => key.toLowerCase().startsWith('sec-fetch-'))
  },
)
