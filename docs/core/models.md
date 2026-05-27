# Model 装饰器体系

## 概述

`@buka/nestjs-kit` 提供了一套声明式的 Model 装饰器体系，用于统一描述数据模型的结构。核心流程为：

1. **`@Model()`** 注册一个类为模型，建立元数据容器，并可配置 schema 级属性
2. **属性装饰器**（`@Property`、`@Composite`、`@List`、`@Dictionary`）描述每个字段的类型与结构
3. 属性装饰器内部自动应用 **class-validator** 验证规则和 **Swagger (`@ApiProperty`)** 文档注解

这一设计让开发者只需编写一次装饰器声明，即可同时获得运行时校验与 API 文档生成能力。

## @Model()

类级别装饰器，将目标类注册到 `ModelRegister` 元数据中心，并可通过选项配置 schema 级属性。

### 选项

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `schema` | `ModelSchemaOptions` | 配置 Swagger/OpenAPI schema 级属性，仅影响文档生成 |
| `additionalProperties` | `boolean \| (() => Class<object>)` | 控制序列化时是否保留未注册的额外字段 |

`ModelSchemaOptions` 支持的字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `description` | `string` | schema 的描述信息 |
| `additionalProperties` | `boolean` | 控制 OpenAPI schema 是否允许额外属性（仅文档） |

**`additionalProperties` 选项说明**

| 值 | 序列化行为 |
| --- | --- |
| 未设置（默认） | 仅输出通过 `@Property`/`@Composite` 等装饰器注册的字段，额外字段被丢弃 |
| `true` | 额外字段原样保留到序列化结果中 |
| `() => SomeModel` | 额外字段按指定 Model 类型递归序列化 |

> 注意：`additionalProperties` 是 `ModelOptions` 的顶级属性，影响运行时序列化行为；`schema.additionalProperties` 是 `ModelSchemaOptions` 的子属性，仅影响 OpenAPI 文档。两者独立配置、互不影响。

### 示例

```typescript
import { Model, Property } from '@buka/nestjs-kit'

// 基础用法
@Model()
class UserProfile {
  @Property() name!: string
}

// 禁止额外属性（仅 OpenAPI 文档）
@Model({ schema: { additionalProperties: false } })
class CreateUserDto {
  @Property() name!: string
  @Property() email!: string
}

// 序列化时保留额外字段
@Model({ additionalProperties: true })
class DynamicConfig {
  @Property() version!: string
  // 其他动态字段在序列化时会被原样保留
}

// 额外字段按指定类型递归序列化
@Model({ additionalProperties: () => MetricValue })
class MetricsMap {
  @Property() timestamp!: string
  // 其他字段会按 MetricValue 的 @Model 元数据递归序列化
}
```

注册后可通过 `ModelRegister.isModel(UserProfile)` 判断该类是否为已注册模型。

> 属性装饰器（`@Property` 等）在调用时会自动执行 `addModel`，因此即使省略 `@Model()`，只要使用了属性装饰器，类也会被隐式注册。但建议始终显式标注 `@Model()` 以提高可读性。

> `schema` 和 `additionalProperties` 配置**不会**被 `PartialType`、`PickType`、`OmitType`、`IntersectionType` 等 converter 继承。如需在派生类上设置这些选项，应在派生类上直接声明。

## @Property()

用于标量属性（`string`、`number`、`boolean` 等基本类型）。

### 选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `optional` | `boolean` | `false` | 标记为可选字段，自动应用 `@IsOptional()` |
| `schema` | `ApiPropertyOptions` | — | 传递给 `@ApiProperty` / `@ApiPropertyOptional` 的 Swagger 配置 |

### 示例

```typescript
import { Model, Property } from '@buka/nestjs-kit'

@Model()
class UserProfile {
  @Property({ schema: { type: 'string', description: '用户名' } })
  name: string

  @Property({ optional: true, schema: { type: 'number' } })
  age?: number
}
```

### 自动应用的装饰器

- `optional: true` → `@IsOptional()` + `@ApiPropertyOptional(schema)`
- `optional: false`（默认）→ `@ApiProperty(schema)`（仅当提供了 `schema` 时）

## @Composite()

用于嵌套单个复合对象的属性。

### 选项

| 选项 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `() => Class<object>` | 是 | 返回嵌套对象的类（使用惰性函数避免循环引用） |
| `optional` | `boolean` | 否 | 标记为可选，默认 `false` |
| `lazy` | `boolean` | 否 | 标记为懒加载属性，默认 `false`。`lazy: true` 时不注册 Swagger schema，详见[懒加载属性](#懒加载属性lazy) |
| `schema` | `ApiPropertyOptions` | 否 | Swagger 配置，默认使用 `{ type: () => options.type() }` |
| `association` | `AssociationMetadata` | 否 | 关联元数据，用于描述 ORM 关系 |

### 示例

```typescript
import { Model, Composite } from '@buka/nestjs-kit'

@Model()
class Order {
  @Composite({ type: () => Address })
  shippingAddress: Address

  @Composite({ type: () => Address, optional: true })
  billingAddress?: Address
}
```

### 自动应用的装饰器

- `@ValidateNested()` — 递归校验嵌套对象
- `@Type(() => TargetClass)` — class-transformer 类型标注
- 必填时 → `@IsNotEmpty()` + `@ApiProperty(schema)`
- 可选时 → `@IsOptional()` + `@ApiPropertyOptional(schema)`

## @List()

用于数组属性，支持**标量数组**和**对象数组**两种场景。

### 选项

| 选项 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `(() => Class<object>)` \| `ScalarClass` | 是 | 数组元素类型。标量传 `String` / `Number` / `Boolean`；对象传惰性函数 |
| `optional` | `boolean` | 否 | 标记为可选，默认 `false` |
| `lazy` | `boolean` | 否 | 标记为懒加载属性，默认 `false`。`lazy: true` 时不注册 Swagger schema，详见[懒加载属性](#懒加载属性lazy) |
| `schema` | `ApiPropertyOptions` | 否 | Swagger 配置 |
| `association` | `AssociationMetadata` | 否 | 关联元数据 |

### 标量数组示例

```typescript
@Model()
class TaggedItem {
  @List({ type: String })
  tags: string[]
}
```

自动应用：`@IsArray()` + `@IsString({ each: true })` + `@ApiProperty({ type: String, isArray: true })`

### 对象数组示例

```typescript
@Model()
class Order {
  @List({ type: () => OrderItem })
  items: OrderItem[]
}
```

自动应用：`@ValidateNested({ each: true })` + `@Type(() => OrderItem)` + `@ApiProperty({ type: () => OrderItem, isArray: true })`

## @Dictionary()

用于字典属性，支持 `Record<string, T>`（默认）和 `Map<string, T>` 两种模式，以及**无类型字典**、**标量字典**和**对象字典**三种场景。

### 选项

| 选项 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `(() => Class<object>)` \| `ScalarClass` | 否 | 值类型。不指定时仅校验为对象 |
| `optional` | `boolean` | 否 | 标记为可选，默认 `false` |
| `map` | `boolean` | 否 | 启用 Map 模式，默认 `false`。见下方 [Record vs Map 模式](#record-vs-map-模式) |
| `schema` | `ApiPropertyOptions` | 否 | Swagger 配置 |
| `association` | `AssociationMetadata` | 否 | 关联元数据 |

### Record vs Map 模式

`@Dictionary` 默认以 `Record<string, T>`（普通对象）方式工作。设置 `map: true` 可切换为 `Map<string, T>` 模式。

| 特性 | Record 模式（默认） | Map 模式（`map: true`） |
| --- | --- | --- |
| 数据类型 | 普通对象 `{ key: value }` | `Map<string, T>` |
| 验证方式 | 自定义验证器遍历 `Object.values()` | class-validator 原生 `{ each: true }` |
| 嵌套错误路径 | 顶层错误信息 | 完整嵌套路径（如 `addresses.home.city`） |
| 适用场景 | JSON 序列化/反序列化、REST API | 需要完整嵌套验证错误路径时 |

### 标量字典示例

```typescript
@Model()
class Config {
  // Record 模式（默认）— 接收普通对象 { key: "value" }
  @Dictionary({ type: String })
  labels: Record<string, string>

  // Map 模式 — 接收 Map<string, number>
  @Dictionary({ type: Number, map: true })
  metrics: Map<string, number>
}
```

**Record 模式自动应用：** `@IsObject()` + `@IsScalarDictionary(String)` + `@ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })`

**Map 模式自动应用：** `@IsObject()` + `@IsString({ each: true })` + `@ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })`

### 对象字典示例

```typescript
@Model()
class Warehouse {
  // Record 模式（默认）
  @Dictionary({ type: () => Stock })
  stockByRegion: Record<string, Stock>

  // Map 模式
  @Dictionary({ type: () => Stock, map: true })
  stockMap: Map<string, Stock>
}
```

**Record 模式自动应用：** `@IsObject()` + `@Transform(...)` + `@ValidateNestedDictionary(() => Stock)` + `@ApiProperty({ type: 'object', additionalProperties: true })`

**Map 模式自动应用：** `@ValidateNested({ each: true })` + `@Type(() => Stock)` + `@ApiProperty({ type: 'object', additionalProperties: true })`

> **提示：** Record 模式下复合类型的验证错误为顶层消息（如 `each value in stockByRegion must be a valid nested object`），不包含嵌套字段路径。如需完整的嵌套错误路径，可使用 `map: true` 模式。

## Association 元数据

`AssociationMetadata` 用于在模型属性上附加实体间的关联信息，主要由 MikroORM 关系装饰器自动设置。

```typescript
interface AssociationMetadata {
  kind: AssociationKind  // '1:1' | '1:m' | 'm:1' | 'm:n'
  type: () => Class<object>
}
```

### AssociationKind 含义

| Kind | 含义 | 对应 ORM 装饰器 | 属性装饰器 |
| --- | --- | --- | --- |
| `1:1` | 一对一 | `@OneToOne()` | `@Composite()` |
| `1:m` | 一对多 | `@OneToMany()` | `@List()` |
| `m:1` | 多对一 | `@ManyToOne()` | `@Composite()` |
| `m:n` | 多对多 | `@ManyToMany()` | `@List()` |

在业务层无需手动设置 `association`，它由 ORM 关系装饰器自动注入。查询关联信息时可通过 `ModelRegister.getProperty()` 获取。

## 懒加载属性（lazy）

`lazy` 选项用于标记那些**默认不会被加载**的属性。当 `lazy: true` 时，装饰器不会为该属性注册 Swagger schema（`@ApiProperty`），因此该属性**不会出现在 API 文档中**。

### 设计意图

Entity 的 Swagger schema 默认应与 `findOne()` **不加任何 populate** 的 `toJSON()` 结果保持一致。MikroORM 默认不加载 Collection 关系（OneToMany / ManyToMany），因此这些属性不应出现在默认的 API 类型中。

### 哪些属性默认是 lazy 的

`Cardinality.OneToMany` 和 `Cardinality.ManyToMany` 装饰器默认设置 `lazy: true`：

```typescript
@Entity()
export class AuthorEntity extends DiscreteEntity {
  @Cardinality.OneToMany(() => BookEntity, (book) => book.author)
  books = new Collection<BookEntity>(this)  // lazy: true，不在 Swagger 中
}
```

`Cardinality.ManyToOne` 和 `Cardinality.OneToOne` **不设置** `lazy: true`，因为未 populate 时它们序列化为 `{ id: "xxx" }` 主键引用，与默认查询结果一致。

### 如何包含 lazy 属性

需要在 API 响应中返回 lazy 属性时，使用 `EntityDto` 派生基本 DTO 后手动声明：

```typescript
// 基本 DTO（lazy 属性自动排除，无 Collection/Ref 类型冲突）
export class AuthorBriefDto extends EntityDto(AuthorEntity) {}

// 详情 DTO（手动添加 lazy 属性）
export class AuthorDetailDto extends EntityDto(AuthorEntity) {
  @List({ type: () => PrimaryKeyType(BookEntity) })
  books!: PrimaryKeyTypeClass[]
}
```

> 直接 `extends AuthorEntity` 会导致 `Collection<Book>` 与 `Book[]` 类型冲突。`EntityDto` 返回不继承实体的独立类，避免了此问题。

同时在 Service 层显式 `populate: ['books']`，确保运行时数据与类型声明一致。

### eager 选项

在 `Cardinality.OneToMany` 或 `Cardinality.ManyToMany` 中设置 `eager: true` 会覆盖默认的 `lazy: true`，使该集合直接出现在 Swagger schema 中：

```typescript
@Cardinality.OneToMany({ entity: () => BookEntity, mappedBy: 'author', eager: true })
books = new Collection<BookEntity>(this)  // 出现在 Swagger 中
```

> 不推荐使用 `eager: true`，因为每次查询都需要 populate 该集合。建议使用派生 DTO 方式按需包含。

## ModelRegister

`ModelRegister` 是元数据注册中心，基于 `reflect-metadata` 存储和检索模型与属性信息。

### 常用静态方法

| 方法 | 说明 |
| --- | --- |
| `addModel(target)` | 注册类为模型，返回 `ModelMetadata`（幂等） |
| `getModel(target)` | 获取模型元数据，未注册时返回 `undefined` |
| `isModel(target)` | 判断类是否已注册为模型 |
| `addProperty(target, key, metadata)` | 注册属性元数据（同时自动注册模型） |
| `getProperty(target, key)` | 获取单个属性的元数据 |
| `getModelPropertyKeys(target)` | 获取模型所有已注册属性的 key 列表 |
| `getProperties(target)` | 获取模型所有属性的 `PropertyMetadata[]` |
| `setProperty(target, key, metadata)` | 直接设置属性元数据（底层方法） |
| `copyProperty(source, target, key)` | 将属性元数据从一个模型复制到另一个 |

### 示例

```typescript
import { ModelRegister } from '@buka/nestjs-kit'

// 判断是否为模型
ModelRegister.isModel(UserProfile) // true

// 获取所有属性 key
ModelRegister.getModelPropertyKeys(UserProfile) // ['name', 'age']

// 获取单个属性的元数据
const meta = ModelRegister.getProperty(UserProfile, 'name')
// { kind: 'scalar', optional: false }
```

