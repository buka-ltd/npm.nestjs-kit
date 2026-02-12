import { registerDecorator, ValidationOptions } from 'class-validator'


export const IS_CROCKFORD_BASE32 = 'isCrockfordBase32'

/**
 * 验证字符串是否为合法的 Crockford Base32 编码。
 *
 * Crockford Base32 使用字符集 `0-9A-HJKMNP-TV-Z`，常用于 ULID 等场景。
 *
 * @param validationOptions - class-validator 的验证选项
 *
 * @example
 * ```typescript
 * class EntityDTO {
 *   @IsCrockfordBase32()
 *   id: string
 * }
 * ```
 */
export function IsCrockfordBase32(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_CROCKFORD_BASE32,
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^[0-9A-HJKMNP-TV-Z]+$/i.test(value)
        },
        defaultMessage() {
          return '$property must be a Crockford Base32 encoded string'
        },
      },
    })
  }
}
