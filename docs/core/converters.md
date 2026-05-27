# Converters — 类型转换工具

## 概述

`@buka/nestjs-kit` 提供了一组基于 Model 元数据的类型转换工具（Converters），用于从已有模型类派生出新的类（DTO、查询对象、响应体等）。

核心能力：

- **派生新类**：从 `@Model()` 注册的模型中选取、排除、合并属性，快速生成 DTO
- **自动复制元数据**：派生类自动继承原始类的 Swagger (`@ApiProperty`)、class-validator、class-transformer 装饰器元数据
- **类型安全**：所有转换器均保留完整的 TypeScript 类型推导

```typescript
import {
  PickType,
  OmitType,
  PartialType,
  ResponseBodyType,
  ListResponseBodyType,
  FilterQuery,
  IFilter,
  OrderQueryType,
} from '@buka/nestjs-kit'
```

> `IntersectionType` 同样从 `@buka/nestjs-kit` 导入。

---

## 基础转换器

### PickType

从模型类中**选取指定属性**，生成仅包含这些属性的新类。

**函数签名**

```typescript
function PickType<T, K extends keyof T>(
  classRef: Class<T>,
  keys: K[]
): Class<Pick<T, K>>
```

**示例**

```typescript
import { PickType } from '@buka/nestjs-kit'

@Model()
class User {
  @Property({ schema: { type: 'string' } })
  name: string

  @Property({ schema: { type: 'string' } })
  email: string

  @Property({ schema: { type: 'number' } })
  age: number
}

// 仅包含 name 和 email
class UserContactDto extends PickType(User, ['name', 'email']) {}
```

> 源类必须使用 `@Model()` 装饰器注册，否则会抛出 `TypeError`。

---

### OmitType

从模型类中**排除指定属性**，生成不包含这些属性的新类。

**函数签名**

```typescript
function OmitType<T, K extends keyof T>(
  classRef: Class<T>,
  keys: K[]
): Class<Omit<T, K>>
```

**示例**

```typescript
import { OmitType } from '@buka/nestjs-kit'

// 排除 age，保留 name 和 email
class CreateUserDto extends OmitType(User, ['age']) {}
```

> 源类必须使用 `@Model()` 装饰器注册，否则会抛出 `TypeError`。

---

### PartialType

将模型类的**所有属性变为可选**，生成新类。

**函数签名**

```typescript
function PartialType<T>(classRef: Class<T>): Class<Partial<T>>
```

**示例**

```typescript
import { PartialType } from '@buka/nestjs-kit'

// 所有属性均为可选，适合用于更新接口的 DTO
class UpdateUserDto extends PartialType(User) {}
```

> `PartialType` 不要求源类必须使用 `@Model()`，但如果源类未注册，则不会复制 Model 属性元数据。

---

### IntersectionType

**合并多个类**的属性，生成包含所有类属性的新类。

**函数签名**

```typescript
function IntersectionType<T extends Type[]>(
  ...classRefs: T
): Type<Intersection of all T>
```

**示例**

```typescript
import { IntersectionType } from '@buka/nestjs-kit'

@Model()
class UserBase {
  @Property({ schema: { type: 'string' } })
  name: string
}

@Model()
class UserExtra {
  @Property({ schema: { type: 'number' } })
  score: number
}

// 同时包含 name 和 score
class FullUserDto extends IntersectionType(UserBase, UserExtra) {}
```

> 支持传入两个或多个类，属性名冲突时以先传入的类为准。

---

## 响应体转换器

### ResponseBodyType

生成**单对象响应包装类**，结构为 `{ data }` 形式。

**函数签名**

```typescript
function ResponseBodyType<T extends object>(
  classRef: Class<T>
): Class<IResponseBody<T>> & { from(data: T): IResponseBody<T> }
```

**响应体结构**

```typescript
interface IResponseBody<DATA> {
  data: DATA
  meta: { [key: string]: any }
}
```

**示例**

```typescript
import { ResponseBodyType } from '@buka/nestjs-kit'

class UserResponseBody extends ResponseBodyType(User) {}

// 在 Controller 中使用
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseBody> {
  const user = await this.userService.findOne(id)
  return UserResponseBody.from(user)
}
```

> `ResponseBodyType` 内部使用 `@Composite()` 装饰 `data` 属性，自动生成 Swagger 文档。

**自动序列化**

`ResponseBodyType` 生成的类内置了 `toJSON()` 方法，在 JSON 序列化时会根据 `@Model()` 元数据递归处理 `data` 属性。对于 MikroORM 实体，已 populate 的关联会完整序列化，未 populate 的关联仅返回主键，无需手动处理。

> `lazy: true` 的属性（如 `OneToMany`、`ManyToMany` 集合）默认不注册 Swagger schema，因此不会出现在 Swagger schema 中。这确保了 API 类型与 `findOne()` 不加 populate 的运行时结果一致。如需在响应中包含 lazy 属性，请使用 [EntityDto](/mikro-orm#entitydto) 派生 DTO 并手动声明。详见 [懒加载属性](/core/models#懒加载属性lazy)。

---

### ListResponseBodyType

生成**列表响应包装类**，结构为 `{ data[], meta: { pagination } }` 形式，支持偏移分页和游标分页。

**函数签名**

```typescript
function ListResponseBodyType<T extends object, MODE extends 'offset' | 'cursor'>(
  classRef: Type<T>,
  mode?: MODE
): Class<IListResponseBody<T, MODE>> & { fromSlice(slice: Slice<T>): IListResponseBody<T, MODE> }
```

**参数**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `classRef` | `Type<T>` | 列表元素的模型类 |
| `mode` | `'offset' \| 'cursor'` | 分页模式。`'offset'` 使用 `OffsetPagination`，`'cursor'` 使用 `CursorPagination` |

**响应体结构**

```typescript
interface IListResponseBody<DATA, MODE> {
  data: DATA[]
  meta: {
    pagination: OffsetPagination | CursorPagination  // 取决于 MODE
  }
}
```

**示例**

```typescript
import { ListResponseBodyType } from '@buka/nestjs-kit'

// 偏移分页
class UserListResponseBody extends ListResponseBodyType(User, 'offset') {}

// 在 Controller 中使用
@Get()
async findAll(): Promise<UserListResponseBody> {
  const slice = await this.userService.findAll()
  return UserListResponseBody.fromSlice(slice)
}
```

> `fromSlice` 方法接受 `Slice<T>` 对象，自动提取 `data` 和 `pagination` 信息。

**自动序列化**

`ListResponseBodyType` 生成的类内置了 `toJSON()` 方法，在 JSON 序列化时会根据 `@Model()` 元数据递归处理 `data` 数组中的每个元素。对于 MikroORM 实体，已 populate 的关联会完整序列化，未 populate 的关联仅返回主键，无需手动处理。

> `lazy: true` 的属性（如 `OneToMany`、`ManyToMany` 集合）默认不注册 Swagger schema，因此不会出现在 Swagger schema 中。这确保了 API 类型与 `findOne()` 不加 populate 的运行时结果一致。如需在响应中包含 lazy 属性，请使用 [EntityDto](/mikro-orm#entitydto) 派生 DTO 并手动声明。详见 [懒加载属性](/core/models#懒加载属性lazy)。

---

## 查询转换器

### FilterQuery

`@FilterQuery()` 参数装饰器，从 query string 中提取 `filter` 参数并自动验证。HTTP 请求使用无前缀的操作符格式（`eq`、`ne`、`gte`），NestJS Controller 接收到的数据自动转换为 `$eq`、`$ne`、`$gte` 格式。

**查询结构**

```typescript
// 完整查询类型（用于 Controller 参数）
interface IFilterQuery<T> {
  filter?: IFilterQueryObject<T>
}

// 快捷类型（用于 Service 层，等价于 IFilterQuery<T>['filter']）
type IFilter<T> = IFilterQueryObject<T> | undefined

// HTTP 请求中使用无前缀操作符
// GET /users?filter={"name":{"eq":"Alice"},"age":{"gte":18}}

// Controller 接收到的类型（自动添加 $ 前缀）
interface IFilterQueryCondition<T> {
  $eq?: T
  $ne?: T
  $lt?: T
  $gt?: T
  $lte?: T
  $gte?: T
  $in?: T[]
  $nin?: T[]
}

// 集合关系属性支持以下操作符（HTTP 用 some/every/none，Controller 收到 $some/$every/$none）
interface IFilterQueryCollectionCondition<T> {
  $some?: IFilterQueryObject<T>
  $every?: IFilterQueryObject<T>
  $none?: IFilterQueryObject<T>
}
```

**示例**

```typescript
import { FilterQuery, IFilterQuery, IFilter } from '@buka/nestjs-kit'

// Controller 中使用 IFilterQuery<T>
@Get()
async findAll(@FilterQuery(User) query: IFilterQuery<User>) {
  // HTTP: ?filter={"name":{"eq":"Alice"},"age":{"gte":18}}
  // query.filter?.name?.$eq === 'Alice'
  // query.filter?.age?.$gte === 18
  return this.userService.findAll(query.filter)
}

// Service 中使用 IFilter<T>
class UserService {
  findAll(filter: IFilter<User>) {
    // filter?.name?.$eq === 'Alice'
  }
}
```

**自定义操作符**

通过 `@FilterQueryOperators` 装饰器可以限制某个属性允许使用的操作符：

```typescript
import { FilterQueryOperators } from '@buka/nestjs-kit'

@Model()
class User {
  @Property({ schema: { type: 'string' } })
  @FilterQueryOperators(['eq', 'ne', 'in'])
  name: string
}
```

> 源类必须使用 `@Model()` 装饰器注册，否则会抛出 `TypeError`。关联属性会自动生成嵌套查询结构。

---

### OrderQueryType

生成**排序查询类**，基于模型属性自动构建排序 JSON Schema。

**函数签名**

```typescript
function OrderQueryType<T>(classRef: Class<T>): Class<IOrderQuery<T>>
```

**查询结构**

```typescript
interface IOrderQuery<T> {
  orderBy?: QueryOrderMap<T> | QueryOrderMap<T>[]
}
```

**示例**

```typescript
import { OrderQueryType } from '@buka/nestjs-kit'

class UserOrderQuery extends OrderQueryType(User) {}

// 在 Controller 中使用
@Get()
async findAll(@Query() query: UserOrderQuery) {
  // query.orderBy === { name: 'asc' }
  // 或数组形式: [{ name: 'asc' }, { age: 'desc' }]
}
```

> `orderBy` 属性为可选字段，通过 JSON Schema 进行校验，支持 `QueryOrderMap` 单个或数组形式。

---

## 组合使用

转换器可以自由组合，快速构建复杂的 DTO 和查询对象：

```typescript
import {
  PickType,
  PartialType,
  FilterQuery,
  OrderQueryType,
  ListResponseBodyType,
} from '@buka/nestjs-kit'

// 创建 DTO
class CreateUserDto extends PickType(User, ['name', 'email', 'age']) {}

// 更新 DTO（所有字段可选）
class UpdateUserDto extends PartialType(CreateUserDto) {}

// 排序查询参数
class UserOrderQuery extends OrderQueryType(User) {}

// 列表响应
class UserListResponse extends ListResponseBodyType(User, 'offset') {}

// 在 Controller 中组合使用
@Get()
async findAll(
  @FilterQuery(User) query: IFilterQuery<User>,
  @Query() order: UserOrderQuery,
) {
  // query.filter?.name?.$eq === 'Alice'
  // order.orderBy === { name: 'asc' }
}
```
