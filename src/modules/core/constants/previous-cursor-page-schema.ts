export const PreviousCursorPageSchema = {
  type: 'object',
  properties: {
    before: { type: 'string' },
    last: { type: 'number' },
  },
  required: ['before', 'last'],
  additionalProperties: false,
}
