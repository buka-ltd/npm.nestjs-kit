import { ExceptionDetailSchema } from './exception-detail-schema.js'

export const ErrorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {
          type: 'array',
          items: ExceptionDetailSchema,
        },
      },
      required: ['code', 'message', 'details'],
      additionalProperties: false,
    },
  },
  required: ['error'],
  additionalProperties: false,
}
