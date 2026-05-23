// 内联自 @nestjs/common/utils/shared.utils
// 避免 deep import 触发 ERR_PACKAGE_PATH_NOT_EXPORTED

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}
