import { describe, expect, it, jest } from '@jest/globals'
import type { EntityManager, MikroORM } from '@mikro-orm/core'
import { ArgumentMetadata } from '@nestjs/common'
import { IsString } from 'class-validator'
import { Composite, Dictionary, List, Model, Property } from '~/modules/core/decorators'
import { PrimaryKeyType } from '~/modules/mikro-orm/converters/entity-primary-key-type/entity-primary-key-type'
import { BukaValidationPipe } from './validation.pipe'


// MikroORM 7 仅提供 ESM，jest 的 CJS 运行时无法直接加载 @mikro-orm/core；
// 管道只在类型层引用 MikroORM / EntityManager，这里补上装饰器元数据会引用到的导出。
jest.mock('@mikro-orm/core', () => ({
  MikroORM: class MikroORM {},
  EntityManager: class EntityManager {},
  helper: () => undefined,
  Reference: { isReference: () => false },
  Utils: { primaryKeyToObject: () => ({}), isPlainObject: () => false },
}))

// uuid 只被 ParseUUIDv7Pipe 一类装饰器链路引用；测试里不需要真实实现，避免加载 ESM 版本。
jest.mock('uuid', () => ({
  validate: () => false,
  v7: () => '00000000-0000-7000-8000-000000000000',
}))

// PrimaryKeyType 依赖 MikroORM 运行时元数据判断主键；测试里直接声明 id 为主键。
jest.mock('~/modules/mikro-orm/utils/mikro-orm-utils', () => ({
  getMetadata: () => [{ name: 'id', primary: true }],
}))

class TestApplication {
  // 至少有一条校验元数据，否则 class-validator 会对「无元数据的对象」判定为 unknownValue
  @Property()
  @IsString()
  id!: string
}

const ApplicationRef = PrimaryKeyType(TestApplication)

@Model()
class InnerDto {
  @Property()
  name!: string
}

@Model()
class CompositeDto {
  @Composite({ type: () => ApplicationRef })
  application!: { id: string }
}

@Model()
class ListDto {
  @List({ type: () => InnerDto })
  nested!: InnerDto[]

  @List({ type: () => ApplicationRef })
  applications!: { id: string }[]
}

@Model()
class DictionaryDto {
  @Dictionary({ type: () => ApplicationRef })
  plain!: Record<string, { id: string }>

  @Dictionary({ type: () => ApplicationRef, map: true })
  mapped!: Map<string, { id: string }>
}

/** 构造只提供 `getReference` 的 EntityManager 替身 */
function createEntityManager(): { em: EntityManager; getReference: jest.Mock } {
  const getReference = jest.fn((entity: unknown, id: unknown) => ({ ref: entity, id }))
  return { em: { getReference } as unknown as EntityManager, getReference }
}

const bodyMetadata: ArgumentMetadata = { type: 'body' }

function createPipe(em: EntityManager): BukaValidationPipe {
  // 管道内部不使用 orm，只需要满足构造签名
  return new BukaValidationPipe({} as MikroORM, em, { transform: true })
}

describe('BukaValidationPipe', () => {
  it('单值 PrimaryKeyType 转换为托管引用', async () => {
    const { em, getReference } = createEntityManager()
    const pipe = createPipe(em)

    const result = await pipe.transform({ application: { id: 'app-1' } }, {
      ...bodyMetadata,
      metatype: CompositeDto,
    })

    expect(getReference).toHaveBeenCalledWith(TestApplication, 'app-1', { wrapped: true })
    expect(result.application).toEqual({ ref: TestApplication, id: 'app-1' })
  })

  it('列表中的 PrimaryKeyType 逐项转换为托管引用', async () => {
    const { em, getReference } = createEntityManager()
    const pipe = createPipe(em)

    const result = await pipe.transform({
      nested: [],
      applications: [{ id: 'app-1' }, { id: 'app-2' }],
    }, { ...bodyMetadata, metatype: ListDto })

    expect(getReference.mock.calls).toEqual([
      [TestApplication, 'app-1', { wrapped: true }],
      [TestApplication, 'app-2', { wrapped: true }],
    ])
    expect(result.applications).toEqual([
      { ref: TestApplication, id: 'app-1' },
      { ref: TestApplication, id: 'app-2' },
    ])
  })

  it('列表中的普通 DTO 仍然递归转换，不调用 getReference', async () => {
    const { em, getReference } = createEntityManager()
    const pipe = createPipe(em)

    const result = await pipe.transform({
      nested: [{ name: 'inner' }],
      applications: [],
    }, { ...bodyMetadata, metatype: ListDto })

    expect(getReference).not.toHaveBeenCalled()
    expect(result.nested).toEqual([{ name: 'inner' }])
  })

  it('字典（普通对象）中的 PrimaryKeyType 逐项转换为托管引用', async () => {
    const { em, getReference } = createEntityManager()
    const pipe = createPipe(em)

    const result = await pipe.transform({
      plain: { primary: { id: 'app-1' } },
      mapped: {},
    }, { ...bodyMetadata, metatype: DictionaryDto })

    expect(getReference).toHaveBeenCalledWith(TestApplication, 'app-1', { wrapped: true })
    expect(result.plain).toEqual({ primary: { ref: TestApplication, id: 'app-1' } })
  })

  it('字典（Map 模式）中的 PrimaryKeyType 逐项转换为托管引用', async () => {
    const { em, getReference } = createEntityManager()
    const pipe = createPipe(em)

    const result = await pipe.transform({
      plain: {},
      mapped: { primary: { id: 'app-1' } },
    }, { ...bodyMetadata, metatype: DictionaryDto })

    expect(getReference).toHaveBeenCalledWith(TestApplication, 'app-1', { wrapped: true })
    expect(result.mapped).toBeInstanceOf(Map)
    expect(result.mapped.get('primary')).toEqual({ ref: TestApplication, id: 'app-1' })
  })
})
