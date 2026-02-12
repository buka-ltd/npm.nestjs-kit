import { ApiPropertyOptions } from '@nestjs/swagger'
import { Class } from 'type-fest'
import { RefAssociationMetadata, Composite } from '../../../core/decorators/model'
import { PrimaryKeyType } from '../../converters/entity-primary-key-type/entity-primary-key-type'

interface EntityRefOptions {
  optional?: boolean
  schema?: ApiPropertyOptions
  association?: RefAssociationMetadata
}

/**
 * 实体引用装饰器，通过实体的主键类型声明对另一个实体的引用。
 *
 * 内部使用 `PrimaryKeyType()` 将实体类转换为仅包含主键字段的 DTO，
 * 适用于创建/更新请求中通过主键关联实体的场景。
 *
 * @param entity - 被引用实体的类引用函数
 * @param options - 可选配置
 *
 * @example
 * ```typescript
 * @Model()
 * class CreatePostDTO {
 *   @Property()
 *   title: string
 *
 *   @EntityRef(() => User)
 *   author: { id: string }
 * }
 * ```
 */
export function EntityRef<T extends object>(
  entity: () => Class<T>,
  options?: EntityRefOptions,
): PropertyDecorator {
  return Composite({
    type: () => PrimaryKeyType(entity()),
    optional: options?.optional,
    schema: options?.schema,
    association: options?.association ?? {
      kind: 'm:1',
      type: entity,
    },
  })
}
