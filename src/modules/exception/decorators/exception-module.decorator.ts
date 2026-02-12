import { Base32 } from '@buka/error-codes'
import { ErrorCodeRegistry } from '../error-code.registry.js'
import {
  isPendingException,
  createExceptionClass,
  type ExceptionConstructor,
} from '../pending-exception.factory.js'

export interface ExceptionModuleOptions {
  /**
   * 模块ID (0 - 1048575)
   * 每个模块唯一，用于区分不同业务模块的错误码
   * 支持十进制数字或 Crockford Base32 字符串
   */
  moduleId: number | string
}

/**
 * 异常模块装饰器
 *
 * 用于定义一组异常类，自动绑定 moduleId 并注册到 ErrorCodeRegistry
 *
 * @example
 * ```typescript
 * import { ModuleExceptions, BusinessException, ValidationException } from '@buka/nestjs-kit'
 *
 * @ModuleExceptions({ moduleId: '1000' })
 * export class UserExceptions {
 *   static readonly NotFound = BusinessException({
 *     sequenceId: 1,
 *     message: 'User not found',
 *   })
 *   static readonly AlreadyExists = BusinessException({
 *     sequenceId: 2,
 *     message: 'User already exists',
 *   })
 *   static readonly InvalidEmail = ValidationException({
 *     sequenceId: 1,
 *     message: 'Invalid email format',
 *   })
 * }
 *
 * // 使用默认消息
 * throw new UserExceptions.NotFound()
 *
 * // 覆盖默认消息
 * throw new UserExceptions.NotFound('Custom message')
 * ```
 */
export function ModuleExceptions(
  options: ExceptionModuleOptions,
): ClassDecorator {
  const moduleId = typeof options.moduleId === 'string'
    ? Base32.decode(options.moduleId)
    : options.moduleId

  // 校验 moduleId 范围
  if (moduleId < 0 || moduleId >= 2 ** 20) {
    throw new Error(
      `Invalid module ID: ${moduleId}, must be between 0 and ${2 ** 20 - 1}`,
    )
  }

  return function <TFunction extends Function>(target: TFunction): TFunction {
    const moduleName = target.name

    // 注册模块ID
    const registry = ErrorCodeRegistry.getInstance()
    registry.registerModule(moduleId, moduleName)

    // 遍历静态属性，将待绑定的配置转换为真正的异常类
    const staticProps = Object.getOwnPropertyNames(target)
    for (const propName of staticProps) {
      // 跳过内置属性
      if (['length', 'name', 'prototype'].includes(propName)) {
        continue
      }

      const descriptor = Object.getOwnPropertyDescriptor(target, propName)
      if (!descriptor || typeof descriptor.get === 'function') {
        continue
      }

      const value = (target as Record<string, unknown>)[propName]

      if (isPendingException(value)) {
        // 创建真正的异常类并替换
        const ExceptionClass = createExceptionClass(
          moduleId,
          moduleName,
          propName,
          value,
        )

        Object.defineProperty(target, propName, {
          value: ExceptionClass,
          writable: false,
          enumerable: true,
          configurable: false,
        })
      }
    }

    // 在类上存储 moduleId 元数据
    Reflect.defineMetadata('exception:moduleId', moduleId, target)

    return target
  }
}

/**
 * 获取异常模块的 moduleId
 * @param target 目标类
 */
export function getExceptionModuleId(target: Function): number | undefined {
  return Reflect.getMetadata('exception:moduleId', target) as number | undefined
}

/**
 * 类型辅助：将 PendingExceptionConfig 转换为 ExceptionConstructor
 *
 * 用于让 TypeScript 正确推断装饰后的类型
 */
export type ResolveExceptions<T> = {
  [K in keyof T]: T[K] extends { __pending: true } ? ExceptionConstructor : T[K]
}
