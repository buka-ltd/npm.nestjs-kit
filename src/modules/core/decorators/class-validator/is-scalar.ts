import { IsBoolean, IsNumber, IsString } from 'class-validator'
import { Class } from 'type-fest'

export type ScalarClass = typeof String | typeof Number | typeof Boolean
export type ExcludeScalarClass<T> = T extends ScalarClass ? never : T

export function isScalarClass(
  ctor: (() => Class<object>) | ScalarClass,
): ctor is ScalarClass {
  return ctor === String || ctor === Number || ctor === Boolean
}

/**
 * 根据标量类型（`String` / `Number` / `Boolean`）自动应用对应的 class-validator 验证装饰器。
 *
 * @param ctor - 标量构造函数：`String`、`Number` 或 `Boolean`
 * @param each - 是否对数组中的每个元素进行验证
 * @returns 对应的 `@IsString()` / `@IsNumber()` / `@IsBoolean()` 装饰器
 *
 * @example
 * ```typescript
 * class MyModel {
 *   @IsScalar(String, true)
 *   tags: string[]
 * }
 * ```
 */
export function IsScalar(ctor: ScalarClass, each: boolean): PropertyDecorator {
  if (ctor === String) return IsString({ each })
  if (ctor === Number) return IsNumber({}, { each })
  return IsBoolean({ each })
}
