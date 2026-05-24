# Core 模块

## 概述

Core 模块是 `@buka/nestjs-kit` 的基础模块，提供全局验证管道、UUIDv7 校验管道、分页查询、Model 装饰器体系、类型转换工具，以及公司级统一资源名称（URN）工具类。

```typescript
import {
  BukaModule,
  PageQuery,
  OptionalPageQuery,
  Slice,
  OffsetPagination,
  CursorPagination,
} from "@buka/nestjs-kit";
```

---

## BukaModule

全局模块，通过 `BukaModule.register()` 注册，自动为应用提供全局 `BukaValidationPipe`。

### 基本用法

```typescript
import { Module } from "@nestjs/common";
import { BukaModule } from "@buka/nestjs-kit";

@Module({
  imports: [BukaModule.register({})],
})
export class AppModule {}
```

### 自定义验证选项

`BukaModule.register()` 接受 `BukaModuleOptions` 参数：

```typescript
interface BukaModuleOptions {
  validation?: ValidationPipeOptions;
}
```

```typescript
BukaModule.register({
  validation: {
    whitelist: true,
    forbidNonWhitelisted: true,
  },
});
```

### 异步注册

```typescript
BukaModule.registerAsync({
  useFactory: () => ({
    validation: {
      whitelist: true,
    },
  }),
});
```

- 不传 `validation` 时，使用 `BukaValidationPipe` 的默认配置
- 传入 `validation` 时，将选项传递给 `BukaValidationPipe` 构造函数

---

## 分页查询装饰器

### @PageQuery(mode?)

控制器方法参数装饰器，从 `query.page` 中解析分页参数，自动注册 Swagger 文档。

```typescript
import { PageQuery, OptionalPageQuery, IPageQuery } from "@buka/nestjs-kit";
```

**参数**

| 参数   | 类型                   | 说明                                       |
| ------ | ---------------------- | ------------------------------------------ |
| `mode` | `'cursor' \| 'offset'` | 可选。限制分页模式，不传则同时支持两种模式 |

**示例**

```typescript
import { Controller, Get } from "@nestjs/common";
import { PageQuery, IPageQuery } from "@buka/nestjs-kit";

@Controller("users")
export class UserController {
  @Get()
  findAll(@PageQuery("offset") page: IPageQuery<"offset">) {
    // page.page === { limit: 10, offset: 0 }
  }
}
```

### @OptionalPageQuery(mode?)

与 `@PageQuery` 相同，但分页参数为可选。当客户端不传 `page` 查询参数时不会报错。

```typescript
@Get()
findAll(@OptionalPageQuery('cursor') page?: IPageQuery<'cursor'>) {
  // page 可能为 undefined
}
```

### 分页参数类型

```typescript
// 偏移分页
type IOffsetPageParameters = {
  limit: number
  offset: number
}

// 游标分页（向后翻页）
type INextCursorPageParameters = {
  first: number
  after: string
}

// 游标分页（向前翻页）
type IPreviousCursorPageParameters = {
  last: number
  before: string
}

// 统一分页查询类型
type IPageQuery<T extends 'cursor' | 'offset'> = {
  page: /* 根据 T 推导具体类型 */
}
```

---

## 请求来源装饰器

### @IsBrowserRequest()

控制器方法参数装饰器，通过检测请求头中是否携带 [`Sec-Fetch-*` 系列头](https://www.w3.org/TR/fetch-metadata/)，判断当前请求是否来自浏览器，为装饰的参数注入 `boolean` 值。

> **原理**：W3C _Fetch Metadata Request Headers_ 规范规定，浏览器在每次发起请求时须自动附加 `Sec-Fetch-Site`、`Sec-Fetch-Mode`、`Sec-Fetch-Dest` 等头。非浏览器客户端（如 curl、Postman、服务端对服务端调用）通常不携带这些头，因此可以此作为区分依据。

```typescript
import { IsBrowserRequest } from "@buka/nestjs-kit";
```

**示例**

```typescript
import { Controller, Get } from "@nestjs/common";
import { IsBrowserRequest } from "@buka/nestjs-kit";

@Controller("users")
export class UserController {
  @Get("me")
  getMe(@IsBrowserRequest() isBrowser: boolean) {
    if (isBrowser) {
      // 浏览器请求，可返回需要前端渲染的完整数据结构
    } else {
      // API 工具 / 服务端调用，可按机器可读格式返回
    }
  }
}
```

**返回值**

| 场景                                        | 值      |
| ------------------------------------------- | ------- |
| 请求头中存在任意 `Sec-Fetch-*` 头（浏览器） | `true`  |
| 请求头中不存在任何 `Sec-Fetch-*` 头         | `false` |

**注意事项**

- 检测是大小写不敏感的（`sec-fetch-mode` 与 `Sec-Fetch-Mode` 均可触发）
- 此装饰器仅适用于 HTTP 传输协议，WebSocket 等其他传输协议需自行处理
- 客户端可手动添加 `Sec-Fetch-*` 头来伪造浏览器请求；请勿将此装饰器用于安全鉴权，仅适合用于内容格式差异化等非安全敏感场景

---

## 分页模型

### Slice\<T\>

分页数据的统一容器，包含数据列表和分页信息。支持迭代器协议和 `map` 操作。

```typescript
import { Slice, OffsetPagination, CursorPagination } from "@buka/nestjs-kit";
```

**静态工厂方法**

| 方法                                        | 说明                              |
| ------------------------------------------- | --------------------------------- |
| `Slice.fromOffset(data, total, parameters)` | 从偏移分页结果创建 Slice          |
| `Slice.fromCursor(cursor)`                  | 从 MikroORM Cursor 对象创建 Slice |

**实例方法**

| 方法                  | 说明                                         |
| --------------------- | -------------------------------------------- |
| `map(fn)`             | 映射数据列表，返回新的 Slice（保留分页信息） |
| `[Symbol.iterator]()` | 支持 `for...of` 遍历                         |

**示例**

```typescript
// 偏移分页
const slice = Slice.fromOffset(users, 100, { limit: 10, offset: 0 });

// 游标分页（配合 MikroORM）
const cursor = await em.findByCursor(
  UserEntity,
  {},
  { first: 10, after: "..." },
);
const slice = Slice.fromCursor(cursor);

// 映射
const dtoSlice = slice.map((user) => new UserDto(user));
```

### OffsetPagination

偏移分页信息模型。

| 属性     | 类型     | 说明     |
| -------- | -------- | -------- |
| `total`  | `number` | 总数     |
| `limit`  | `number` | 每页数量 |
| `offset` | `number` | 偏移量   |

### CursorPagination

游标分页信息模型。

| 属性          | 类型             | 说明         |
| ------------- | ---------------- | ------------ |
| `total`       | `number?`        | 总数（可选） |
| `limit`       | `number`         | 每页数量     |
| `startCursor` | `string \| null` | 开始游标     |
| `endCursor`   | `string \| null` | 结束游标     |
| `hasNextPage` | `boolean`        | 是否有下一页 |
| `hasPrevPage` | `boolean`        | 是否有上一页 |

---

## ParseUUIDv7Pipe

参数级 Pipe，校验路由参数是否为合法的 UUIDv7 格式。校验失败时抛出 `BadRequestException`，行为与 NestJS 内置 `ParseUUIDPipe` 一致。

```typescript
import { ParseUUIDv7Pipe } from "@buka/nestjs-kit";
```

**使用示例**

```typescript
import { Controller, Get, Param } from "@nestjs/common";
import { ParseUUIDv7Pipe } from "@buka/nestjs-kit";

@Controller("users")
export class UserController {
  @Get(":id")
  findOne(@Param("id", ParseUUIDv7Pipe) id: string) {
    // id 已保证为合法的 UUIDv7
  }
}
```

**校验规则**

- 必须为合法 UUID 格式
- UUID 版本必须为 7
- 不满足条件时抛出 `BadRequestException('Validation failed (UUIDv7 is expected)')`

---

## Class Validator 装饰器

Core 模块提供了几个自定义的 class-validator 装饰器：

### @HasAnyKey(keys)

验证对象是否包含指定 key 列表中的至少一个。

```typescript
import { HasAnyKey } from "@buka/nestjs-kit";

class UpdateDto {
  @HasAnyKey(["name", "email", "age"])
  data: Record<string, any>;
}
```

### @MatchJsonSchema(schema)

验证属性值是否匹配给定的 JSON Schema。

```typescript
import { MatchJsonSchema } from "@buka/nestjs-kit";

class ConfigDto {
  @MatchJsonSchema({
    type: "object",
    properties: { host: { type: "string" } },
    required: ["host"],
  })
  database: any;
}
```

### IsScalar(ctor, each)

内部工具函数，根据标量类型（`String` / `Number` / `Boolean`）返回对应的 class-validator 装饰器。

---

## 更多文档

- [Model 装饰器体系](./models.md) — `@Model()`、`@Property()`、`@Composite()`、`@List()`、`@Dictionary()` 等
- [类型转换工具](./converters.md) — `PickType`、`OmitType`、`PartialType`、`ResponseBodyType`、`@FilterQuery` 等
- [URN 统一资源名称](./urn.md) — `Urn`、`DomainUrn`、`ResourceTypeUrn`、`ResourceIdUrn`、`@IsUrn()`、通配符 `*`/`**`、`contains()` 等
