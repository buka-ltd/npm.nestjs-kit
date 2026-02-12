import { Class } from 'type-fest'
import { ModelRegister } from '~/modules/core/decorators'
import { OmitType } from '../omit-type/omit-type'


/**
 * 从模型中排除所有标记为 `lazy: true` 的属性，生成仅包含非懒加载字段的新类型。
 *
 * 适用于 API 响应场景，避免返回未加载的字段。
 *
 * @param classRef - 使用 `@Model()` 标注的类引用
 * @returns 排除了 lazy 属性的新类
 *
 * @example
 * ```typescript
 * @Model()
 * class User {
 *   @Property()
 *   name: string
 *
 *   @Property({ lazy: true })
 *   bio: string
 * }
 *
 * const UserResponse = EagerType(User)
 * // UserResponse 仅包含 name，不包含 bio
 * ```
 */
export function EagerType<T>(classRef: Class<T>): Class<T> {
  if (!ModelRegister.isModel(classRef)) {
    throw new TypeError('EagerType only accepts a class annotated with @Model().')
  }

  const lazyKeys: (keyof T)[] = []
  for (const propertyKey of ModelRegister.getModelPropertyKeys(classRef)) {
    const metadata = ModelRegister.getProperty(classRef, propertyKey)
    if (metadata?.lazy) {
      lazyKeys.push(propertyKey as keyof T)
    }
  }

  if (lazyKeys.length === 0) return classRef
  return OmitType(classRef, lazyKeys) as unknown as Class<T>
}
