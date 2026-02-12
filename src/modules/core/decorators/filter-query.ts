import { Query } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { Class } from 'type-fest'
import { getFilterQuerySchema } from '../converters/filter-query-type/get-filter-query-schema'
import { SchemaObject } from '~/swagger-patcher/swagger-patcher'
import { FilterQueryTransformPipe } from '../pipes/filter-query-validation.pipe'


/**
 * 过滤查询参数装饰器，从 query string 中提取 `filter` 参数，
 * 将前端传入的无前缀操作符（`eq`、`ne`、`gte`）自动转换为后端的 `$eq`、`$ne`、`$gte` 格式。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 *
 * @example
 * ```typescript
 * @Controller('users')
 * class UserController {
 *   @Get()
 *   findAll(@FilterQuery(User) query: IFilterQuery<User>) {
 *     // HTTP: ?filter={"name":{"eq":"Alice"}}
 *     // query.filter?.name?.$eq === 'Alice'
 *   }
 * }
 * ```
 */
export function FilterQuery<T>(classRef: Class<T>): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('@FilterQuery decorator can only be used on method parameters.')
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(target, propertyKey)!

    ApiQuery({
      name: 'filter',
      required: false,
      schema: getFilterQuerySchema(classRef) as SchemaObject,
    })(target, propertyKey, descriptor)

    Query(new FilterQueryTransformPipe(classRef))(target, propertyKey, parameterIndex)
  }
}
