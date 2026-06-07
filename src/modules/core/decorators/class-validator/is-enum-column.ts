import { isEnum, registerDecorator, type ValidationOptions } from 'class-validator'

export const IS_ENUM_COLUMN = 'isEnumColumn'

/**
 * 枚举列验证器，验证单个值是否为合法的枚举值。
 *
 * 延迟解析 `items`（在验证阶段才调用工厂函数），避免装饰器阶段因循环引用报错。
 * 同时兼容两种写法：枚举对象 `() => Status` 和值数组 `() => Object.values(Status)`。
 *
 * 验证逻辑委托给 class-validator 内置的 `isEnum` / `Array.includes`。
 * 如需校验数组，配合 `IsArray()` 和 `{ each: true }` 使用。
 *
 * @param items - 枚举对象、值数组，或返回它们的工厂函数
 * @param validationOptions - class-validator 的验证选项
 *
 * @example
 * ```typescript
 * // 单值校验
 * class MyDto {
 *   @IsEnumColumn(() => Status)
 *   status: Status
 * }
 *
 * // 数组校验
 * class MyDto {
 *   @IsArray()
 *   @IsEnumColumn(() => Status, { each: true })
 *   statuses: Status[]
 * }
 * ```
 */
export function IsEnumColumn(
  items: (() => object | (string | number)[]) | object | (string | number)[],
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: IS_ENUM_COLUMN,
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [items],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          const rawValues = typeof items === 'function' ? items() : items
          if (Array.isArray(rawValues)) {
            return rawValues.includes(value)
          }
          // 枚举对象 → 复用 class-validator 内置 isEnum
          return isEnum(value, rawValues)
        },
        defaultMessage(): string {
          const rawValues = typeof items === 'function' ? items() : items
          const allowedValues: (string | number)[] = Array.isArray(rawValues)
            ? rawValues
            : Object.values(rawValues).filter((v) => isNaN(Number(v)))
          return `$property 必须是以下之一: ${allowedValues.join(', ')}`
        },
      },
    })
  }
}
