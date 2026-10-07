import { describe, expect, it } from '@jest/globals'
import { ArgumentMetadata, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { BukaPageQueryValidationPipe } from './page-query-validation.pipe'


/** query 参数元数据，本 pipe 仅接受 query 类型 */
const queryMetadata: ArgumentMetadata = { type: 'query' }

/** 断言非法分页参数被收敛为 400，而不是 `in` 运算符抛出的 TypeError（最终 500） */
function expectBadRequest(value: unknown, mode?: 'cursor' | 'offset'): void {
  const pipe = new BukaPageQueryValidationPipe({ mode })
  expect(() => {
    pipe.transform(value, queryMetadata)
  }).toThrow(BadRequestException)
  expect(() => {
    pipe.transform(value, queryMetadata)
  }).toThrow('Invalid page query: page must be an object.')
}

describe('BukaPageQueryValidationPipe', () => {
  describe('page 为标量 / 数组等非对象形态', () => {
    it('页码字符串（?page=1）', () => {
      expectBadRequest({ page: '1' })
    })

    it('非数字字符串（?page=abc）', () => {
      expectBadRequest({ page: 'abc' })
    })

    it('数字原始值', () => {
      expectBadRequest({ page: 1 })
    })

    it('数组（?page[]=1）', () => {
      expectBadRequest({ page: ['1'] })
    })

    it('在 offset 模式下同样被拦截', () => {
      expectBadRequest({ page: '1' }, 'offset')
    })

    it('在 cursor 模式下同样被拦截', () => {
      expectBadRequest({ page: '1' }, 'cursor')
    })
  })

  describe('offset 分页', () => {
    it('解析 limit 与 offset', () => {
      const pipe = new BukaPageQueryValidationPipe()
      expect(pipe.transform({ page: { limit: '30', offset: '0' } }, queryMetadata))
        .toEqual({ page: { limit: 30, offset: 0 } })
    })

    it('limit 非正整数时抛 400', () => {
      const pipe = new BukaPageQueryValidationPipe()
      expect(() => {
        pipe.transform({ page: { limit: '0', offset: '0' } }, queryMetadata)
      }).toThrow('Invalid page query: limit must be a positive integer.')
    })
  })

  describe('cursor 分页', () => {
    it('解析 next cursor 参数', () => {
      const pipe = new BukaPageQueryValidationPipe()
      expect(pipe.transform({ page: { first: '10', after: 'abc' } }, queryMetadata))
        .toEqual({ page: { after: 'abc', first: 10 } })
    })

    it('解析 previous cursor 参数', () => {
      const pipe = new BukaPageQueryValidationPipe()
      expect(pipe.transform({ page: { last: '10' } }, queryMetadata))
        .toEqual({ page: { before: '', last: 10 } })
    })
  })

  describe('mode 限制', () => {
    it('offset 模式拒绝 cursor 参数', () => {
      const pipe = new BukaPageQueryValidationPipe({ mode: 'offset' })
      expect(() => {
        pipe.transform({ page: { first: '10' } }, queryMetadata)
      }).toThrow('Invalid page query: missing pagination parameters.')
    })
  })

  describe('缺失 page 参数', () => {
    it('必填时抛 400', () => {
      const pipe = new BukaPageQueryValidationPipe()
      expect(() => {
        pipe.transform({}, queryMetadata)
      }).toThrow('Missing required query parameter: page')
    })

    it('可选时原样返回', () => {
      const pipe = new BukaPageQueryValidationPipe({ optional: true })
      expect(pipe.transform({ keyword: 'a' }, queryMetadata)).toEqual({ keyword: 'a' })
    })
  })

  describe('非 query 元数据', () => {
    it('抛 500', () => {
      const pipe = new BukaPageQueryValidationPipe()
      expect(() => {
        pipe.transform({ page: { limit: '1', offset: '0' } }, { type: 'body' })
      }).toThrow(InternalServerErrorException)
    })
  })
})
