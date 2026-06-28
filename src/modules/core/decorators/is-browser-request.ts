import { createParamDecorator, ExecutionContext } from '@nestjs/common'


/**
 * 参数装饰器，通过检测请求头中是否存在 `Sec-Fetch-Site` 头，
 * 判断请求是否来自浏览器。
 *
 * 浏览器在发起请求时会自动附加 `Sec-Fetch-Site`、`Sec-Fetch-Mode`、
 * `Sec-Fetch-Dest` 等头（[Fetch Metadata Request Headers](https://www.w3.org/TR/fetch-metadata/)）。
 * 非浏览器客户端（如 curl、Postman）通常不会携带这些头。
 *
 * **注意：** Node.js 的 undici（globalThis.fetch）会自动添加 `Sec-Fetch-Mode: cors`，
 * 但不会添加 `Sec-Fetch-Site`。因此使用 `Sec-Fetch-Site` 而非任意 `Sec-Fetch-*`
 * 头来区分真正的浏览器请求和服务端 fetch 调用。
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
    // 使用 Sec-Fetch-Site 而非任意 Sec-Fetch-* 头来判断
    // 浏览器会同时发送 Sec-Fetch-Mode + Sec-Fetch-Site + Sec-Fetch-Dest
    // Node.js undici 仅发送 Sec-Fetch-Mode: cors，不发送 Sec-Fetch-Site
    return Object.keys(request.headers).some((key) => key.toLowerCase() === 'sec-fetch-site')
  },
)
