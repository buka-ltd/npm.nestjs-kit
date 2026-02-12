/* eslint-disable @typescript-eslint/no-unsafe-return */
import { helper, Reference, Utils } from '@mikro-orm/core'
import { Class } from 'type-fest'
import { isScalarClass } from '../class-validator/is-scalar'
import { ModelRegister } from './model.register'

type WrappedEntity = ReturnType<typeof helper>

/**
 * 序列化 Model 实例为普通 JSON 对象。
 *
 * 处理三种情况：
 * 1. Ref<Entity> 包装 → populated 时完整序列化，否则返回主键
 * 2. 普通 MikroORM 实体（find 返回的）→ toJSON() 完整序列化
 * 3. 非 MikroORM 值 → 按 @Model 注册的属性元数据递归序列化
 */
export function serializeModel(value: any, classRef: Class<any>): any {
  if (value == null) return value

  // 检查是否为 MikroORM 实体/Ref
  const wrapped: WrappedEntity | undefined = typeof value === 'object' ? helper(value) : undefined

  if (wrapped) {
    // Ref<Entity>：populated 的完整序列化，否则只返回主键
    if (Reference.isReference(value)) {
      return wrapped.__populated
        ? wrapped.toJSON()
        : serializePrimaryKey(wrapped)
    }

    // 普通实体（find 返回的）→ 完整序列化
    return wrapped.toJSON()
  }

  // 非 MikroORM 值 → @Model 属性遍历或原样返回
  return serializeModelProperties(value, classRef)
}

/**
 * 按 @Model 注册的属性元数据遍历并序列化对象的各个属性。
 *
 * 根据属性的 kind 分别处理：
 * - composite: 递归调用 serializeModel
 * - list: 对数组中每个元素递归序列化（标量类型除外）
 * - dictionary: 对字典中每个值递归序列化（标量类型除外）
 * - 其他: 原样返回
 *
 * 若 classRef 未注册为 Model，则直接返回原始值。
 */
function serializeModelProperties(value: any, classRef: Class<any>): any {
  if (!ModelRegister.isModel(classRef)) return value

  const modelMeta = ModelRegister.getModel(classRef)!
  const registeredKeys = new Set<string | symbol>(modelMeta.propertyKeys)
  const result: Record<string | symbol, any> = {}

  for (const key of registeredKeys) {
    const meta = ModelRegister.getProperty(classRef, key)
    if (!meta || !(key in value)) continue
    const val = value[key]

    if (meta.kind === 'composite') {
      result[key] = serializeModel(val, meta.type())
    } else if (meta.kind === 'list' && meta.type && !isScalarClass(meta.type)) {
      const type = meta.type()
      result[key] = Array.isArray(val) ? val.map((i: any) => serializeModel(i, type)) : val
    } else if (meta.kind === 'dictionary' && meta.type && !isScalarClass(meta.type)) {
      const type = meta.type()
      if (val instanceof Map) {
        result[key] = Object.fromEntries(Array.from(val.entries()).map(([k, v]) => [k, serializeModel(v, type)]))
      } else {
        result[key] = val != null ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, serializeModel(v, type)])) : val
      }
    } else {
      result[key] = val
    }
  }

  const ap = modelMeta.additionalProperties
  if (ap) {
    for (const key of Object.keys(value)) {
      if (registeredKeys.has(key)) continue
      const val = value[key]
      if (typeof ap === 'function') {
        result[key] = serializeModel(val, ap())
      } else {
        result[key] = val
      }
    }
  }

  return result
}

/**
 * 提取 PK 并根据 forceObject 格式化
 * 复刻 EntityTransformer.processEntity 的 PK 分支逻辑
 */
function serializePrimaryKey(wrapped: WrappedEntity): any {
  const pk = wrapped.getPrimaryKey()
  const meta = wrapped.__meta
  const platform = wrapped.__platform
  const forceObject = wrapped.__config?.get('serialization')?.forceObject

  if (forceObject) {
    return Utils.primaryKeyToObject(meta, pk)
  }

  if (Utils.isPlainObject(pk)) {
    return Utils.primaryKeyToObject(meta, pk)
  }

  return platform.normalizePrimaryKey(pk as any)
}
