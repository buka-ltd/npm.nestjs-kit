import { registerDecorator, ValidationOptions } from 'class-validator'


export const HAS_ANY_KEY = 'hasAnyKey'

/**
 * 验证对象至少包含指定 key 中的一个。
 *
 * @param keys - 允许的 key 列表，对象中至少需存在其一
 * @param validationOptions - class-validator 的验证选项
 *
 * @example
 * ```typescript
 * class FilterDTO {
 *   @HasAnyKey(['$eq', '$ne', '$in'])
 *   name: { $eq?: string; $ne?: string; $in?: string[] }
 * }
 * ```
 */
export function HasAnyKey(keys: readonly string[], validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: HAS_ANY_KEY,
      target: object.constructor,
      propertyName: propertyName,
      constraints: [keys],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'object' || value === null) return false
          for (const key of keys) {
            if (key in value) return true
          }
          return false
        },
        defaultMessage() {
          return `$property must have at least one of the keys: ${keys.join(', ')}`
        },
      },
    })
  }
}
