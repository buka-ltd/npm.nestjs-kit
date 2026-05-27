# MikroORM 集成

## 简介

`@buka/nestjs-kit` 提供了一套专为 MikroORM + NestJS 项目设计的类型辅助工具集，主要解决以下痛点：

- **减少重复代码**：字段装饰器自动生成 `@nestjs/swagger` 和 `class-validator` 装饰器，一次声明即可同时获得 ORM 映射、运行时校验与 API 文档
- **开发提效**：简化实体定义、DTO 构建等常见操作

```typescript
import { Column, Cardinality, EntityRef, BaseEntity } from '@buka/nestjs-kit/mikro-orm'
```

## 初始配置

### 1. MikroORM 配置

在 `mikro-orm.config.ts` 中启用以下配置：

```typescript
export default defineConfig({
  serialization: {
    forceObject: true, // 强制将外键序列化为对象
  },
  forceUndefined: true, // 未定义字段返回 undefined 而非 null
  // ...其他配置
})
```

> [!TIP]
> **为什么需要 `forceObject`？**
>
> 启用后，外键会序列化为 `object` 而非 `id`。详见 [官方文档](https://mikro-orm.io/docs/serializing#foreign-keys-are-forceobject)

### 2. Swagger CLI 插件配置（可选）

如果使用 `@nestjs/swagger` CLI 插件，建议在 `tsconfig.json` 中配置：

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "introspectComments": true,
          "dtoFileNameSuffix": [".dto.ts", ".bo.ts", ".ro.ts"]
        }
      }
    ]
  }
}
```

> [!IMPORTANT] 不要包含 `.entity.ts`
>
> `@nestjs/swagger` 对 MikroORM 的 `Ref` 和 `Collection` 添加的装饰器是错误的。
> 为解决这个问题，请使用 `@buka/nestjs-kit` 提供的字段装饰器（如 `Column.Varchar`、`Cardinality.ManyToOne` 等）定义实体。

---

## 基础实体类

所有的 Entity 都必须扩展以下基类之一，否则无法使用其他功能。

### TimestampedEntity

**适用场景**：不需要主键 `id` 的特殊实体（如中间表、日志表等）

**包含字段**：

- `createdAt: Date` — 创建时间（自动填充 `CURRENT_TIMESTAMP`）
- `updatedAt: Date` — 更新时间（自动更新 `CURRENT_TIMESTAMP`）

**泛型参数**：`<Optional = never>` — 允许子类声明额外的可选属性

```typescript
import { TimestampedEntity } from '@buka/nestjs-kit/mikro-orm'

@Entity()
export class UserLoginLogEntity extends TimestampedEntity {
  @Column.Varchar({ length: 64 })
  userId!: string

  @Column.Varchar({ length: 64 })
  ipAddress!: string
}
```

### LinearEntity

**适用场景**：需要 BigInt 自增主键的实体

**包含字段**：

- `id: string` — 主键（BigInt，以字符串形式表示，校验 `@IsNumberString()`）
- 继承 `TimestampedEntity` 的 `createdAt`、`updatedAt`

```typescript
import { LinearEntity } from '@buka/nestjs-kit/mikro-orm'

@Entity()
export class EventLogEntity extends LinearEntity {
  @Column.Varchar({ length: 256 })
  message!: string
}
```

### DiscreteEntity（推荐）

**适用场景**：绝大多数普通实体

**包含字段**：

- `id: string` — 主键（UUID，默认使用 `uuidv7()` 生成，校验 `@IsString()`）
- 继承 `TimestampedEntity` 的 `createdAt`、`updatedAt`

```typescript
import { DiscreteEntity } from '@buka/nestjs-kit/mikro-orm'

@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Varchar({ length: 64, comment: '书名' })
  name!: string
}
```

> **建议**：99% 的实体都应该继承 `DiscreteEntity`，除非有特殊需求。

---

## 字段装饰器 (Column)

所有列类型装饰器通过 `Column` 命名空间导出，每个装饰器直接对应一种数据库列类型，自动添加 Swagger 文档和验证规则。

```typescript
import { Column } from '@buka/nestjs-kit/mikro-orm'
```

### 基础用法

```typescript
import { DiscreteEntity, Column } from '@buka/nestjs-kit/mikro-orm'

@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Varchar({
    length: 64,
    comment: '书名',
  })
  name!: string

  @Column.Text({
    comment: '书籍简介',
    nullable: true,
  })
  description?: string

  @Column.Int({
    comment: '页数',
    default: 0,
  })
  pages!: number
}
```

### 可用列类型

| 装饰器 | 数据库类型 | TypeScript 类型 | 自动应用的 class-validator | 说明 |
|--------|-----------|----------------|--------------------------|------|
| `Column.Varchar` | `varchar` | `string` | `@IsString()`, `@MaxLength()` | 变长字符串，支持 `length` |
| `Column.Char` | `char` | `string` | `@IsString()` | 定长字符串，支持 `length` |
| `Column.Text` | `text` | `string` | `@IsString()` | 长文本 |
| `Column.Money` | `numeric` | `string` | `@IsNumber()` | 货币类型 |
| `Column.Int` | `int` | `number` | `@IsInt()` | 32 位整数 |
| `Column.Smallint` | `smallint` | `number` | `@IsInt()` | 16 位整数 |
| `Column.Tinyint` | `tinyint` | `number` | `@IsInt()` | 8 位整数 |
| `Column.Bigint` | `bigint` | `string \| number` | `@IsString()` | 64 位整数，默认 string 模式 |
| `Column.Double` | `double` | `number` | `@IsNumber()` | 双精度浮点 |
| `Column.Numeric` | `numeric` | `number` | `@IsNumber()` | 精确数值 |
| `Column.Boolean` | `boolean` | `boolean` | `@IsBoolean()` | 布尔值 |
| `Column.Uuid` | `uuid` | `string` | `@IsUUID()` | UUID |
| `Column.Timestamptz` | `timestamptz` | `Date` | — | 带时区时间戳 |
| `Column.Enum` | `enum` | `enum` | `@IsEnum()` | 枚举 |
| `Column.Jsonb` | `jsonb` | `object` | — | JSONB |
| `Column.Transient` | — | `any` | — | 非持久化字段 |
| `Column.Embedded` | — | `object` | — | 嵌入式实体 |

### Column.Enum — 枚举字段

```typescript
export enum BookType {
  NOVEL = 'novel',
  SCIENCE = 'science',
  HISTORY = 'history',
}

@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Enum({
    enumName: 'BOOK_TYPE',
    items: () => BookType,
    comment: '书籍类型',
  })
  type!: BookType
}
```

### Column.Jsonb — JSONB 字段

```typescript
@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Jsonb({
    type: () => MetadataDto,
    comment: '元数据',
  })
  metadata!: MetadataDto
}
```

### Column.Embedded — 嵌入式实体

```typescript
@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Embedded(() => Address)
  address!: Address
}
```

### Column.Transient — 非持久化字段

```typescript
@Entity()
export class BookEntity extends DiscreteEntity {
  @Column.Transient()
  temp!: string
}
```

---

## 关系装饰器 (Cardinality)

所有关系装饰器通过 `Cardinality` 命名空间导出，封装 MikroORM 的关系装饰器并内部调用 Model 层的 `@Composite()` 或 `@List()`，同时自动附加 `association` 元数据。

```typescript
import { Cardinality } from '@buka/nestjs-kit/mikro-orm'
```

### 与 Model 层装饰器的对应关系

| 装饰器 | ORM 关系 | 内部调用 | AssociationKind |
| --- | --- | --- | --- |
| `Cardinality.OneToOne` | `@OrmOneToOne()` | `@Composite()` | `1:1` |
| `Cardinality.OneToMany` | `@OrmOneToMany()` | `@List()` | `1:m` |
| `Cardinality.ManyToOne` | `@OrmManyToOne()` | `@Composite()` | `m:1` |
| `Cardinality.ManyToMany` | `@OrmManyToMany()` | `@List()` | `m:n` |

### Cardinality.ManyToOne — 多对一关系

**场景示例**：一本书属于一个作者

```typescript
@Entity()
export class BookEntity extends DiscreteEntity {
  @Cardinality.ManyToOne(() => AuthorEntity, {
    comment: '作者',
  })
  author!: Ref<AuthorEntity>
}
```

### Cardinality.OneToMany — 一对多关系

**场景示例**：一个作者有多本书

```typescript
@Entity()
export class AuthorEntity extends DiscreteEntity {
  @Cardinality.OneToMany(() => BookEntity, (book) => book.author, {
    comment: '作品列表',
  })
  books = new Collection<BookEntity>(this)
}
```

> `OneToMany` 默认 `lazy: true`，该集合**不会**出现在 Swagger 文档中。这与 MikroORM 默认不 populate 集合的行为一致——`findOne()` 的 `toJSON()` 结果不含未填充的 Collection。如需在响应中包含此集合，请使用 `EntityDto` 派生 DTO 并手动声明，同时显式 `populate`。详见 [EntityDto](/core/converters#entitydto) 和 [懒加载属性（lazy）](/core/models#懒加载属性lazy)。

### Cardinality.OneToOne — 一对一关系

**场景示例**：一个用户有一份详细资料

```typescript
@Entity()
export class UserEntity extends DiscreteEntity {
  @Cardinality.OneToOne(() => UserProfileEntity, {
    comment: '用户资料',
  })
  profile!: Ref<UserProfileEntity>
}
```

### Cardinality.ManyToMany — 多对多关系

**场景示例**：一本书可以有多个标签，一个标签可以关联多本书

```typescript
@Entity()
export class BookEntity extends DiscreteEntity {
  @Cardinality.ManyToMany(() => TagEntity, {
    comment: '标签列表',
  })
  tags = new Collection<TagEntity>(this)
}
```

> `ManyToMany` 默认 `lazy: true`，该集合**不会**出现在 Swagger 文档中。这与 MikroORM 默认不 populate 集合的行为一致。如需包含，请使用 `EntityDto` 派生 DTO 并手动声明，或设置 `eager: true`。详见 [EntityDto](/core/converters#entitydto) 和 [懒加载属性（lazy）](/core/models#懒加载属性lazy)。

> 所有关系装饰器都会自动添加 Swagger 文档和验证规则，无需手动配置。
> 当关系设置了 `hidden: true` 时，仅应用 `@ApiHideProperty()` 而不会注册模型属性元数据。

---

## EntityDto

从实体生成**无继承关系**的纯 DTO 类，用于安全派生响应类型。

### 解决的问题

直接 `extends` MikroORM 实体会引入 `Collection<Entity>` 类型。当你在派生 DTO 中重新声明同名字段（如 `comments: PrimaryKeyTypeClass[]`）时，TypeScript 会报类型冲突——父类的 `Collection<CommentEntity>` 与子类的 `PrimaryKeyTypeClass[]` 不兼容。

`EntityDto` 返回的类**不继承**源实体，因此不存在此冲突。同时它自动排除 `lazy: true` 的属性，Swagger schema 与 `findOne()` 不加 populate 的结果一致。

### 类型转换

`EntityDtoShape<T>` 对实体类型做以下变换：

| 实体类型 | DTO 类型 | 原因 |
|---------|---------|------|
| `Collection<Entity>` | 键被排除 | 默认 `lazy: true`，不在 Swagger 中 |
| `Ref<Entity>` | `Ref<Entity>`（保留） | nestjs-kit 一等公民，序列化层自动处理 |
| `Xxx & Opt` | `Xxx \| undefined` | 去除 MikroORM 标记 |

### 示例

```typescript
import { EntityDto } from '@buka/nestjs-kit/mikro-orm'

@Entity()
class ArticleEntity extends DiscreteEntity {
  @Column.Varchar({ length: 64, comment: '标题' })
  title!: string

  @Column.Text({ comment: '正文内容', lazy: true })
  content?: string

  @Cardinality.ManyToOne({ entity: () => AuthorEntity, ref: true })
  author!: Ref<AuthorEntity>

  @Cardinality.OneToMany({ entity: () => CommentEntity, mappedBy: 'article' })
  comments = new Collection<CommentEntity>(this)
}

// 基本 DTO — 排除 content（标量 lazy）和 comments（集合 lazy）
class ArticleBriefDto extends EntityDto(ArticleEntity) {}

// 详情 DTO — 将 lazy 属性显式加回
class ArticleDetailDto extends EntityDto(ArticleEntity) {
  @Property({ schema: { description: '正文内容' } })
  content?: string

  @List({ type: () => PrimaryKeyType(CommentEntity) })
  comments!: PrimaryKeyTypeClass[]
}
```

> `EntityDto` 是推荐的实体→响应 DTO 派生方式。对于需要选取特定字段的场景，使用 `PickType`。

---

## PrimaryKeyType

`PrimaryKeyType()` 工厂函数基于实体的主键字段自动生成只包含主键的 DTO 类。

**使用场景**：API 请求中只需要传递关联实体的 ID 时。

```typescript
import { PrimaryKeyType } from '@buka/nestjs-kit/mikro-orm'

// 继承 PrimaryKeyType 生成只包含主键的 DTO 类
class BookPrimaryKeyDto extends PrimaryKeyType(BookEntity) {}
```

工作原理：

1. 扫描实体类的主键属性
2. 生成包含主键属性的新类
3. 自动复制 Swagger 元数据、class-validator 校验规则和 class-transformer 转换规则
4. 使用 WeakMap 缓存，多次调用返回同一个类

---

## EntityRef

`@EntityRef()` 是 `@Composite({ type: () => PrimaryKeyType(Entity) })` 的快捷装饰器，用于在 Model 层声明实体引用（只包含主键字段）。

```typescript
import { EntityRef } from '@buka/nestjs-kit/mikro-orm'
```

### 基础用法

```typescript
import { EntityRef } from '@buka/nestjs-kit/mikro-orm'
import { IEntityPrimaryKey } from '@buka/nestjs-kit/mikro-orm'

@Model()
class CreateBookDto {
  // Before
  @Composite({ type: () => PrimaryKeyType(AuthorEntity) })
  author: IEntityPrimaryKey<AuthorEntity>

  // After — 等价写法
  @EntityRef(() => AuthorEntity)
  author: IEntityPrimaryKey<AuthorEntity>
}
```

### 选项

| 选项 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `optional` | `boolean` | 否 | 标记为可选，默认 `false` |
| `schema` | `ApiPropertyOptions` | 否 | Swagger 配置 |
| `association` | `AssociationMetadata` | 否 | 关联元数据 |

### 可选字段示例

```typescript
@Model()
class UpdateBookDto {
  @EntityRef(() => AuthorEntity, { optional: true })
  author?: IEntityPrimaryKey<AuthorEntity>
}
```

---

## 类型工具

`@buka/nestjs-kit/mikro-orm` 导出了一组用于处理 MikroORM 类型标记的工具类型。

| 类型 | 说明 |
| --- | --- |
| `ExcludeOpt<T>` | 移除 MikroORM 的 `Opt` 标记和 `undefined`，获取实际值类型 |
| `ExcludeRef<T>` | 解包 `Ref<T>` 得到底层实体类型；非 Ref 类型原样返回 |
| `ExcludeHidden<T>` | 移除 MikroORM 的 `Hidden` 标记 |
| `IsOpt<T>` | 布尔类型，判断 T 是否被 `Opt` 标记包裹 |
| `IsHidden<T>` | 布尔类型，判断 T 是否被 `Hidden` 标记包裹 |

```typescript
import type { ExcludeOpt, ExcludeRef, IsHidden } from '@buka/nestjs-kit/mikro-orm'

// Ref<UserEntity> → UserEntity
type User = ExcludeRef<Ref<UserEntity>>

// string & Opt → string
type Name = ExcludeOpt<string & Opt>

// true
type Hidden = IsHidden<string & Hidden>
```

---

## DatabaseConfig

`DatabaseConfig` 是数据库配置基类，配合 `@buka/nestjs-config` 使用，简化 MikroORM 的连接配置。

### 配置属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `debug` | `boolean` | `false` | 启用调试模式 |
| `migration` | `boolean` | `false` | 启用迁移支持 |
| `dbName` | `string` | — | 数据库名称（必填） |
| `host` | `string` | — | 数据库主机（必填） |
| `port` | `number` | — | 数据库端口（必填） |
| `user` | `string` | — | 数据库用户（必填） |
| `password` | `string` | — | 数据库密码（必填） |
| `timezone` | `string` | `'+08:00'` | 数据库时区 |

### toMikroOrmOptions()

将 `DatabaseConfig` 转换为 MikroORM `Options`，默认启用：

- `forceUndefined: true`
- `flushMode: COMMIT`
- `serialization.forceObject: true`
- 自定义错误处理（抛出 `BadRequestException`）
- 当 `migration: true` 时自动配置迁移选项

```typescript
import * as path from 'path'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { Configuration } from '@buka/nestjs-config'
import { DatabaseConfig } from '@buka/nestjs-kit/mikro-orm'

const srcDir = path.resolve(__dirname, '../')

@Configuration('postgresql')
export class PostgresqlConfig extends DatabaseConfig {
  toMikroOrmOptions(): Options {
    let options = super.toMikroOrmOptions()

    options = {
      ...options,
      driver: PostgreSqlDriver,
      baseDir: srcDir,
      entities: ['**/*.entity.js'],
      migrations: {
        path: path.join(srcDir, 'migrations'),
        pathTs: path.join(srcDir, 'migrations'),
      },
    }

    return options
  }
}
```
