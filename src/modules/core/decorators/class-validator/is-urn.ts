import { registerDecorator, ValidationOptions } from 'class-validator'
import { Urn } from '../../models/urn.js'


export const IS_URN = 'isUrn'
export const IS_DOMAIN_URN = 'isDomainUrn'

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
 * 验证字符串是否匹配指定的 URN 模式（支持通配符 `*` 和 `**`）。
 *
 * - `*` 匹配恰好一个段
 * - `**` 匹配零个或多个尾部段
 *
 * @example
 * ```typescript
 * class CreateClientDTO {
 *   @MatchesUrn('urn:buka:galaxy:client:*')
 *   clientUrn: string
 * }
 * ```
 */
export function MatchesUrn(pattern: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'matchesUrn',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          try {
            const urn = Urn.parse(value)
            const patternUrn = Urn.parse(pattern)
            return patternUrn.contains(urn)
          } catch {
            return false
          }
        },
        defaultMessage() {
          return `$property must match URN pattern ${pattern}`
        },
      },
    })
  }
}
