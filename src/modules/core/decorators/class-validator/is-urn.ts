import { registerDecorator, ValidationOptions } from 'class-validator'
import { Urn } from '../../models/urn.js'


export const IS_URN = 'isUrn'
export const IS_DOMAIN_URN = 'isDomainUrn'
export const IS_RESOURCE_TYPE_URN = 'isResourceTypeUrn'
export const IS_RESOURCE_ID_URN = 'isResourceIdUrn'

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
          return '$property must be a valid URN (urn:buka:<domain>[:<resource-type>[:<resource-id>]])'
        },
      },
    })
  }
}

/**
 * 验证字符串是否为概念域级 URN（仅含 domain，无 resourceType 和 resourceId）。
 *
 * @example
 * ```typescript
 * class TokenPayloadDTO {
 *   @IsDomainUrn()
 *   aud: string
 * }
 * ```
 */
export function IsDomainUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_DOMAIN_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            return Urn.parse(value).isDomainUrn()
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be a domain-level URN (urn:buka:<domain>)'
        },
      },
    })
  }
}

/**
 * 验证字符串是否为资源类型级 URN（含 domain 和 resourceType，无 resourceId）。
 *
 * @example
 * ```typescript
 * class ResourceDTO {
 *   @IsResourceTypeUrn()
 *   resourceType: string
 * }
 * ```
 */
export function IsResourceTypeUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_RESOURCE_TYPE_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            return Urn.parse(value).isResourceTypeUrn()
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be a resource-type-level URN (urn:buka:<domain>:<resource-type>)'
        },
      },
    })
  }
}

/**
 * 验证字符串是否为实例级 URN（含完整三段：domain、resourceType 和 resourceId）。
 *
 * @example
 * ```typescript
 * class TokenPayloadDTO {
 *   @IsResourceIdUrn()
 *   sub: string
 * }
 * ```
 */
export function IsResourceIdUrn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: IS_RESOURCE_ID_URN,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            return Urn.parse(value).isResourceIdUrn()
          } catch {
            return false
          }
        },
        defaultMessage() {
          return '$property must be a resource-id-level URN (urn:buka:<domain>:<resource-type>:<resource-id>)'
        },
      },
    })
  }
}
