import { ApiSchema } from '@nestjs/swagger'
import { Class } from 'type-fest'
import { ModelRegister } from './model.register'


export interface ModelSchemaOptions {
  description?: string
  additionalProperties?: boolean
}

export interface ModelMetadata {
  propertyKeys: (string | symbol)[]
  schema?: ModelSchemaOptions
  additionalProperties?: boolean | (() => Class<object>)
}

export interface ModelOptions {
  /**
   * Swagger/OpenAPI schema 配置，透传给 `@ApiSchema()`。
   * 仅影响文档生成，不影响运行时序列化行为。
   */
  schema?: ModelSchemaOptions
  /**
   * 控制序列化时是否保留未通过 `@Property`/`@Composite` 等装饰器注册的额外字段。
   *
   * - `true`：额外字段原样保留
   * - `() => Class`：额外字段按指定 Model 类型递归序列化
   * - 未设置（默认）：额外字段在序列化时被丢弃
   */
  additionalProperties?: boolean | (() => Class<object>)
}

/**
 * 模型类装饰器，标记一个 class 为模型，使其可被 Converter（如 `PickType`、`OmitType`）识别和处理。
 *
 * @param options - 可选的模型配置
 *
 * @example
 * ```typescript
 * @Model({ schema: { description: '用户信息' } })
 * class UserDTO {
 *   @Property()
 *   name: string
 * }
 * ```
 */
export function Model(options?: ModelOptions): ClassDecorator {
  return (target: Function) => {
    const metadata = ModelRegister.addModel(target as Class<any>)

    if (options?.additionalProperties) {
      metadata.additionalProperties = options.additionalProperties
    }

    if (options?.schema) {
      metadata.schema = options.schema
      ApiSchema(options.schema as any)(target)
    }
  }
}
