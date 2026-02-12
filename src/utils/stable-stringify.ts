/**
 * 稳定的 JSON 序列化，确保键按字母顺序排列，忽略 null 和 undefined
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const items = value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => stableStringify(item))
    return `[${items.join(',')}]`
  }

  if (typeof value === 'object') {
    const sortedKeys = Object.keys(value).sort()
    const pairs: string[] = []

    for (const key of sortedKeys) {
      const val = (value as Record<string, unknown>)[key]
      if (val !== null && val !== undefined) {
        const serializedValue = stableStringify(val)
        if (serializedValue !== '') {
          pairs.push(`${JSON.stringify(key)}:${serializedValue}`)
        }
      }
    }

    return `{${pairs.join(',')}}`
  }

  return ''
}
