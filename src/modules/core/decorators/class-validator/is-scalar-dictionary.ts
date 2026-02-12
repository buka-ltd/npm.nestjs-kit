import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'
import { ScalarClass } from './is-scalar'


export const IS_SCALAR_DICTIONARY = 'isScalarDictionary'

/**
 * 验证普通对象（Record）中的每个 value 是否为指定的标量类型。
 *
 * 与 class-validator 内置的 `{ each: true }` 不同，此验证器通过 `Object.values()` 遍历普通对象的值，
 * 而非仅支持 Array / Map / Set。
 *
 * @param ctor - 标量构造函数：`String`、`Number` 或 `Boolean`
 * @param validationOptions - class-validator 的验证选项
 *
 * @example
 * ```typescript
 * class ConfigDTO {
 *   @IsScalarDictionary(String)
 *   metadata: Record<string, string>
 * }
 * ```
 */
export function IsScalarDictionary(ctor: ScalarClass, validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: IS_SCALAR_DICTIONARY,
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [ctor],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
          const [ctor] = args.constraints
          const typeName = ctor === String ? 'string' : ctor === Number ? 'number' : 'boolean'
          return Object.values(value).every((v) => {
            if (typeName === 'number') return typeof v === 'number' && !Number.isNaN(v)
            return typeof v === typeName
          })
        },
        defaultMessage(args: ValidationArguments) {
          const [ctor] = args.constraints
          const typeName = ctor === String ? 'string' : ctor === Number ? 'number' : 'boolean'
          return `each value in $property must be a ${typeName}`
        },
      },
    })
  }
}
