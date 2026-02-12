export const NextCursorPageSchema = {
  type: 'object',
  properties: {
    after: { type: 'string' },
    first: { type: 'number' },
  },
  required: ['after', 'first'],
  additionalProperties: false,
}
