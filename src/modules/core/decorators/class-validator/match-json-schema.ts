import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'
import { validate } from 'jsonschema'


export const MATCH_JSON_SCHEMA = 'matchJsonSchema'


/**
 * 验证属性值是否符合给定的 JSON Schema。
 *
 * @param schema - JSON Schema 定义
 * @param validationOptions - class-validator 的验证选项
 *
 * @example
 * ```typescript
 * class ConfigDTO {
 *   @MatchJsonSchema({
 *     type: 'object',
 *     properties: { key: { type: 'string' } },
 *     required: ['key'],
 *   })
 *   config: Record<string, any>
 * }
 * ```
 */
export function MatchJsonSchema(schema: any, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: MATCH_JSON_SCHEMA,
      target: object.constructor,
      propertyName: propertyName,
      constraints: [schema],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [schema] = args.constraints

          const results = validate(value, schema)
          return results.valid
        },
        defaultMessage({ value, constraints }: ValidationArguments) {
          return `${propertyName} must match the JSON schema`
        },
      },
    })
  }
}

