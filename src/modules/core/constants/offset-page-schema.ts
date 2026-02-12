export const OffsetPageSchema = {
  type: 'object',
  properties: {
    limit: { type: 'number' },
    offset: { type: 'number' },
  },
  required: ['limit', 'offset'],
  additionalProperties: false,
}
