import { Class } from 'type-fest'
import { IResponseBody } from './types/index.js'
import { Composite, serializeModel } from '~/modules/core/decorators/index.js'


type IResponseBodyClass<T> = Class<IResponseBody<T>> & {
  from(data: T): IResponseBody<T>
}


/**
 * 生成标准响应体类型，将数据包裹在 `{ data: T }` 结构中。
 *
 * 返回的类包含 `from()` 静态方法和 `toJSON()` 序列化支持。
 *
 * @param classRef - 响应数据的模型类引用
 * @returns 包含 `data` 属性的响应体类
 *
 * @example
 * ```typescript
 * const UserResponse = ResponseBodyType(UserDTO)
 *
 * @Controller('users')
 * class UserController {
 *   @Get(':id')
 *   async findOne(@Param('id') id: string): Promise<UserResponse> {
 *     const user = await this.userService.findOne(id)
 *     return UserResponse.from(user)
 *   }
 * }
 * ```
 */
export function ResponseBodyType<T extends object>(classRef: Class<T>): IResponseBodyClass<T> {
  class ResponseBodyClass {
    constructor(public data: T) {}

    static from(data: T, meta: Record<string, any>): ResponseBodyClass {
      const instance = new ResponseBodyClass(data)
      return instance
    }

    toJSON(): any {
      return { data: serializeModel(this.data, classRef) }
    }
  }

  Composite({
    type: () => classRef,
    schema: {
      type: () => classRef,
    },
  })(ResponseBodyClass.prototype, 'data')

  return ResponseBodyClass as unknown as IResponseBodyClass<T>
}
