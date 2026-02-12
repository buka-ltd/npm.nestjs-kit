import { registerDecorator, ValidationOptions } from 'class-validator'
import { Urn } from '../../models/urn.js'


export const IS_URN = 'isUrn'
export const IS_NAMESPACE_URN = 'isNamespaceUrn'
export const IS_RESOURCE_URN = 'isResourceUrn'
export const IS_IDENTIFIER_URN = 'isIdentifierUrn'

/**
 * 验证字符串是否为合法的 URN（任意层级）。
 *
 * @example
 * ```typescript
 * class TokenPayloadDTO {
 *   @IsUrn()
 *   sub: string
 * }
 * ```
 */
export function IsUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            Urn.parse(value)
            return true
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be a valid URN (urn:buka-inc:<namespace>[:<resource>[:<identifier>]])'
        },
      },
    })
  }
}

/**
 * 验证字符串是否为 namespace 级 URN（仅含 namespace，无 resource 和 identifier）。
 *
 * @example
 * ```typescript
 * class TokenPayloadDTO {
 *   @IsNamespaceUrn()
 *   aud: string
 * }
 * ```
 */
export function IsNamespaceUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_NAMESPACE_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            return Urn.parse(value).isNamespaceUrn()
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be a namespace-level URN (urn:buka-inc:<namespace>)'
        },
      },
    })
  }
}

/**
 * 验证字符串是否为资源类型级 URN（含 namespace 和 resource，无 identifier）。
 *
 * @example
 * ```typescript
 * class ResourceDTO {
 *   @IsResourceUrn()
 *   resourceType: string
 * }
 * ```
 */
export function IsResourceUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_RESOURCE_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            return Urn.parse(value).isResourceUrn()
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be a resource-level URN (urn:buka-inc:<namespace>:<resource>)'
        },
      },
    })
  }
}

/**
 * 验证字符串是否为实例级 URN（含完整三段：namespace、resource 和 identifier）。
 *
 * @example
 * ```typescript
 * class TokenPayloadDTO {
 *   @IsIdentifierUrn()
 *   sub: string
 * }
 * ```
 */
export function IsIdentifierUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_IDENTIFIER_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            return Urn.parse(value).isIdentifierUrn()
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be an identifier-level URN (urn:buka-inc:<namespace>:<resource>:<identifier>)'
        },
      },
    })
  }
}
