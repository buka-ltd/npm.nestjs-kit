import { registerDecorator, validateSync, ValidationOptions } from 'class-validator'
import { Class } from 'type-fest'


export const VALIDATE_NESTED_DICTIONARY = 'validateNestedDictionary'

/**
 * 验证普通对象（Record）中的每个 value 是否为有效的嵌套对象实例。
 *
 * 通过 `Object.values()` 遍历字典值，对每个值调用 `validateSync()` 进行嵌套验证。
 * 与 class-validator 内置的 `@ValidateNested({ each: true })` 不同，此验证器支持普通对象，
 * 而非仅支持 Array / Map / Set。
 *
 * @param typeFunc - 延迟求值的嵌套类型引用 `() => Class`
 * @param validationOptions - class-validator 的验证选项
 *
 * @example
 * ```typescript
 * class UserDTO {
 *   @ValidateNestedDictionary(() => AddressDTO)
 *   addresses: Record<string, AddressDTO>
 * }
 * ```
 */
export function ValidateNestedDictionary(typeFunc: () => Class<object>, validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: VALIDATE_NESTED_DICTIONARY,
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [typeFunc],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
          return Object.values(value).every((v) => {
            if (typeof v !== 'object' || v == null) return false
            const errors = validateSync(v)
            return errors.length === 0
          })
        },
        defaultMessage() {
          return 'each value in $property must be a valid nested object'
        },
      },
    })
  }
}
