import { describe, expect, it, jest } from '@jest/globals'
import { Property as MikroOrmProperty } from '@mikro-orm/decorators/legacy'
import { validate, ValidationError } from 'class-validator'
import { ModelRegister } from '~/modules/core/decorators/model/model.register'
import { DECORATORS } from '~/utils/internals/nestjs-swagger'
import { Column } from './index'
import { Date as DateColumn } from './date.column'


// MikroORM 7 仅提供 ESM，jest 的 CJS 运行时无法直接加载 @mikro-orm/core。
// 这里只 mock 装饰器入口与序列化模块用到的少量导出，保留 kit 自己的 @Property/Model 元数据逻辑。
jest.mock('@mikro-orm/core', () => ({
  helper: () => undefined,
  Reference: { isReference: () => false },
  Utils: { primaryKeyToObject: () => ({}), isPlainObject: () => false },
}))

jest.mock('@mikro-orm/decorators/legacy', () => ({
  Property: jest.fn(() => jest.fn()),
}))

// core/decorators 的 page-query/filter-query 会从 pipes 取值；mock 掉 pipes 可避免
// 经 validation.pipe 反向加载 mikro-orm/models，进而与 Column 形成循环依赖。
jest.mock('~/modules/core/pipes', () => ({}))


class DateColumnTestEntity {
  @DateColumn({ comment: '计划日期' })
  planDate!: string

  @DateColumn({ nullable: true, comment: '可选日期' })
  optionalDate?: string
}

/** 取某个属性上的校验约束名，便于断言命中了哪条规则 */
function constraintsOf(errors: ValidationError[], property: string): string[] {
  return errors
    .filter((error) => error.property === property)
    .flatMap((error) => Object.keys(error.constraints ?? {}))
}

describe('Column.Date', () => {
  it('注册到 Column 命名空间', () => {
    expect(Column.Date).toBe(DateColumn)
  })

  it('把 type: date 与列配置透传给 MikroORM @Property', () => {
    expect(MikroOrmProperty).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'date', comment: '计划日期' }),
    )
    expect(MikroOrmProperty).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'date', nullable: true, comment: '可选日期' }),
    )
  })

  it('注册 Model 元数据并保留 optional 标记', () => {
    expect(ModelRegister.getProperty(DateColumnTestEntity, 'planDate'))
      .toEqual({ kind: 'scalar', optional: false, lazy: false })
    expect(ModelRegister.getProperty(DateColumnTestEntity, 'optionalDate'))
      .toEqual({ kind: 'scalar', optional: true, lazy: false })
  })

  it('生成 format: date 的 Swagger schema', () => {
    expect(Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DateColumnTestEntity.prototype, 'planDate'))
      .toMatchObject({ type: 'string', format: 'date', description: '计划日期', required: true })
    expect(Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DateColumnTestEntity.prototype, 'optionalDate'))
      .toMatchObject({ type: 'string', format: 'date', description: '可选日期', required: false })
  })

  describe('校验', () => {
    it('接受合法的 YYYY-MM-DD', async () => {
      const entity = Object.assign(new DateColumnTestEntity(), { planDate: '2026-10-24' })
      expect(await validate(entity)).toEqual([])
    })

    it('拒绝不存在的日历日', async () => {
      const entity = Object.assign(new DateColumnTestEntity(), { planDate: '2026-02-30' })
      expect(constraintsOf(await validate(entity), 'planDate')).toContain('isIso8601')
    })

    it('拒绝带时间的 ISO 字符串', async () => {
      const entity = Object.assign(new DateColumnTestEntity(), { planDate: '2026-10-24T00:00:00Z' })
      expect(constraintsOf(await validate(entity), 'planDate')).toContain('matches')
    })

    it('拒绝紧凑日期格式', async () => {
      const entity = Object.assign(new DateColumnTestEntity(), { planDate: '20261024' })
      expect(constraintsOf(await validate(entity), 'planDate')).toContain('matches')
    })

    it('必填日期缺失时报错', async () => {
      expect(constraintsOf(await validate(new DateColumnTestEntity()), 'planDate')).toContain('isDefined')
    })

    it('nullable 日期缺失时跳过校验，但提供非法值时报错', async () => {
      expect(constraintsOf(await validate(new DateColumnTestEntity()), 'optionalDate')).toEqual([])

      const entity = Object.assign(new DateColumnTestEntity(), {
        planDate: '2026-10-24',
        optionalDate: '2026-02-30',
      })
      expect(constraintsOf(await validate(entity), 'optionalDate')).toContain('isIso8601')
    })
  })
})
