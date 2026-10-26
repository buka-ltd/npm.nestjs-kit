# 实体与关系(MikroORM 集成)

> 本文件由 [nestjs-kit-coding-standards/SKILL.md](../SKILL.md) 按需加载(定义实体时读本文件)。导入来源、事务与异常红线等通用约定见 [SKILL.md 「通用约定」章](../SKILL.md#通用约定跨文件类型);目录归属见 [SKILL.md 「目录组织」章](../SKILL.md#业务模块目录组织)。

## 前置条件

- 项目已完成 ORM 初始化(连接、migrations 等),实体的注册经 `MikroOrmModule.forFeature([...])` 完成。
- 实体在 API 中的默认呈现(外键序列化为 `{ id }` 骨架、未定义字段为 undefined)由 kit 默认序列化行为提供,实体本身无需手写 Swagger 装饰器。

## 命名与放置

实体存放于 `src/modules/<module-name>/entities/<name>.entity.ts`(目录规范见 [SKILL.md 「目录组织」章](../SKILL.md#业务模块目录组织))。一个实体一个文件,后缀 `.entity.ts`。若项目使用 `@nestjs/swagger` CLI 插件,`tsconfig.json` 的 `dtoFileNameSuffix` **不要包含 `.entity.ts`**——该插件对 MikroORM `Ref/Collection` 推断出的装饰器是错误的;实体的 Swagger 一律由 `Column.*`/`Cardinality.*` 自动生成。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 声明实体类 | `@Entity()`(自 `@mikro-orm/decorators/legacy` 导入)+ 继承基类 |
| 普通业务实体 | `DiscreteEntity`(UUIDv7 主键) |
| 自增主键实体 | `LinearEntity`(BigInt string) |
| 无主键附加表 | `TimestampedEntity` |
| 标量字段 | `Column.Varchar` / `Column.Text` / `Column.Int` / `Column.Boolean` 等 |
| 枚举字段 | `Column.Enum({ items, enumName })` |
| JSON 结构字段 | `Column.Jsonb({ type: () => Dto })` |
| 嵌入实体 | `Column.Embedded(() => Embeddable)` |
| 关系字段 | `Cardinality.ManyToOne` / `OneToOne` / `OneToMany` / `ManyToMany` |
| 引用类型/集合类型 | `Ref<Entity>` / `Collection<Entity>`(自 `@mikro-orm/core` 导入) |

## 基类选型

| 基类 | 主键 | 时间戳 | 适用 |
|---|---|---|---|
| `DiscreteEntity` | `id: string`,uuid 列 + `uuidv7()` 默认值;校验 `@IsUUID('7')` | ✅ | **绝大多数实体**(默认选择) |
| `LinearEntity` | `id: string`,`BigIntType('string')`;校验 `@IsNumberString()` | ✅ | 需要 BigInt 自增时序、非敏感暴露 |
| `TimestampedEntity` | 无 | ✅ `createdAt`/`updatedAt` | 中间表、日志表等无主键场景 |

三者都有泛型参数 `<Optional = never>`:声明 `extends DiscreteEntity<'extra' | 'fields'>` 让 MikroORM `OptionalProps` 感知子类有默认值的属性(有默认值的字段装饰器 `default` + 属性初始化需同时声明)。

## Column 列装饰器(18 种)

一次声明自动叠加三到四层:MikroORM `@Property` 映射 + class-validator 校验 + Swagger schema + Model 元数据。所有列支持 `comment`(同时写入数据库注释与 Swagger description)、`nullable`(联动 TS 可选与 Swagger required)、`default`/`onCreate`/`onUpdate`/`defaultRaw`、`lazy`(不默认查询、不出现在 Swagger)、`example/examples`。

| 装饰器 | TS 类型 | 自动校验 | 备注 |
|---|---|---|---|
| `Column.Varchar` | `string` | `IsString` + `MaxLength(length)` | 支持 `length` |
| `Column.Char` | `string` | `IsString` + `MinLength` + `MaxLength` | 定长,支持 `length` |
| `Column.Text` | `string` | `IsString` | 长文本 |
| `Column.Money` | `string` | `IsCurrency` | Swagger `format: 'money'`;金额用 string 防精度丢失 |
| `Column.Int` | `number` | `IsInt` | |
| `Column.Smallint` | `number` | `IsInt` | |
| `Column.Tinyint` | `number` | `IsInt` | |
| `Column.Bigint` | `string`(默认)/`number` | `IsString` / `IsInt` | 选项 `mode: 'string' \| 'number'`,默认 string 防精度丢失 |
| `Column.Double` | `number` | `IsNumber` | |
| `Column.Numeric` | `number` | `IsNumber` | |
| `Column.Boolean` | `boolean` | `IsBoolean` | |
| `Column.Uuid` | `string` | `IsString` | 需要版本校验时叠加 `@IsUUID('7')` |
| `Column.Date` | `string` | `Matches` + `IsISO8601({ strict: true })` | Swagger `format: 'date'`;JS 侧是 `YYYY-MM-DD` 字符串,不是 `Date` 对象 |
| `Column.Timestamptz` | `Date` | `IsISO8601` | 带时区时间戳 |
| `Column.Enum` | 自定义 enum | `IsEnumColumn`(`array: true` 时 `IsArray` + each) | `items` 必填,见下 |
| `Column.Jsonb` | DTO 对象 / 数组 | 无(可选) | 见下 |
| `Column.Transient` | `any` | 无 | 非持久化 |
| `Column.Embedded` | 嵌入类 | 无 | 嵌入式实体 |

### 枚举列

```typescript
export enum BookStatus { DRAFT = 'draft', PUBLISHED = 'published' }

@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Enum({
    items: () => BookStatus,   // 必填:枚举或取值数组,函数形式避免循环引用
    enumName: 'BOOK_STATUS',   // 数据库 enum 类型名
    comment: '状态',
    default: BookStatus.DRAFT,
  })
  status!: BookStatus
}
```

### JSONB 列

```typescript
@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Jsonb({ type: () => BookMetadata, comment: '元数据' })
  metadata!: BookMetadata          // kind: 'composite'(默认)

  @Column.Jsonb({ type: () => Tag, kind: 'list', comment: '标签' })
  tags!: Tag[]                     // kind: 'list'(隐藏属性默认 hidden,不进入 API 响应)
}
```

### 嵌入式实体

```typescript
@Embeddable()
export class Audit {
  @Column.Varchar({ length: 64, comment: '操作人' })
  operator!: string
}

@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Embedded(() => Audit, { object: true })
  audit!: Audit
}
```

## Cardinality 关系装饰器(4 种)

封装 MikroORM `@OneToOne/@OneToMany/@ManyToOne/@ManyToMany`,内部同步注册 Model 元数据(to-one 走 `@Composite`、to-many 走 `@List`)与 Swagger schema。

四类关系装饰器统一使用 options 对象签名:`OneToMany` **仅接受 options 签名**(不接受位置式参数),`ManyToOne`/`OneToOne`/`ManyToMany` 兼容两种签名但统一使用 options 风格以保持一致性。

| 装饰器 | ORM 关系 | 字段类型 | 默认 Swagger 形态 |
|---|---|---|---|
| `Cardinality.ManyToOne` | m:1 | `Ref<Entity>` 或 `Entity` | `PrimaryKeyType`(`{ id }` 骨架) |
| `Cardinality.OneToOne` | 1:1 | `Ref<Entity>` 或 `Entity` | `PrimaryKeyType`(`{ id }` 骨架) |
| `Cardinality.OneToMany` | 1:m | `Collection<Entity>` | 不出现在 Swagger(默认 lazy) |
| `Cardinality.ManyToMany` | m:n | `Collection<Entity>` | 不出现在 Swagger(默认 lazy) |

非 eager 关系在 API 中默认以主键骨架 `{ id: 'xx' }` 呈现;`eager: true` 时才是完整实体对象结构。`mappedBy`:反向关系必填(`OneToMany` 强制),`ManyToMany` 双向时在其中一侧声明。

```typescript
import { Entity } from '@mikro-orm/decorators/legacy'
import { Collection, Ref } from '@mikro-orm/core'
import { Cardinality, Column, DiscreteEntity } from '@buka/nestjs-kit'

@Entity({ comment: '图书' })
export class BookEntity extends DiscreteEntity {
  @Column.Varchar({ length: 64, comment: '书名' })
  name!: string

  @Cardinality.ManyToOne({
    entity: () => AuthorEntity,
    comment: '作者',
    hidden: false,          // true 时仅 ApiHideProperty,不注册模型元数据
  })
  author!: Ref<AuthorEntity>
}

@Entity({ comment: '作者' })
export class AuthorEntity extends DiscreteEntity {
  @Column.Varchar({ length: 64, comment: '姓名' })
  name!: string

  @Cardinality.OneToMany({
    entity: () => BookEntity,
    mappedBy: 'author',     // 必填
    comment: '作品列表',
  })
  books = new Collection<BookEntity>(this)
}
```

常见选项:`entity`(必填,`() => Target` 函数形式避免循环引用)、`comment`、`nullable`、`ref: true`、`eager`(MikroORM 自动 populate + Swagger 用完整实体)、`hidden`、`mappedBy`、`pivotEntity`(`ManyToMany`,无中间表实体时可省略)、`owner`/`inversedBy`(`ManyToMany` 双向时)。

## 实体派生与类型工具

- `EntityDto(Entity)` / `PrimaryKeyType(Entity)` / `@EntityRef(() => Entity)` —— 响应 DTO 派生,见 [references/dto.md](dto.md)
- 类型工具(`import type { ... } from '@buka/nestjs-kit'`):
  `ExcludeRef<T>`(解包 Ref → 实体)、`ExcludeOpt<T>`(去除 Opt/undefined)、`ExcludeHidden<T>`、`IsOpt<T>`、`IsHidden<T>`

## 注意事项

- 每个 `Column.*`/`Cardinality.*` 必须传 `comment`(中文语义;同时是数据库注释与 Swagger description)
- 关联默认返回 `Ref` 骨架;detail 接口才用 `EntityDto(Entity)` 派生 + 显式 `populate`;`eager: true` 只用于确需全量关联的场景
- `Column.Money`/`Column.Bigint`(默认 mode)类型是 `string`,属性声明为 `string` 而非 `number`
- 枚举列 `items` 永远用 `() => Enum` 函数形式(避免编译期循环引用问题)
- 基类为 `DiscreteEntity`/`LinearEntity`/`TimestampedEntity`;`BaseEntity` 类不存在于 kit 中
- 时间戳字段由 `TimestampedEntity` 统一提供,无需自行添加 `createdAt` 列
- filter/order 能力直接依赖本文件装饰器生成的元数据(见 [references/query.md](query.md))