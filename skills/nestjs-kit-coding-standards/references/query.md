# list 查询三件套(过滤 / 排序 / 分页)

> 本文件是 [编码规约](../SKILL.md) 的按需加载部分(实现 list 查询时读本文件)。导入来源、事务与异常等硬红线见 [SKILL.md 「硬红线」章](../SKILL.md#硬红线跨文件通用);目录归属见 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织)。

## 命名与放置

过滤 DTO(`XxxFilterQueryDto`)、排序类(`XxxOrderQuery`)与分页参数类型随请求参数 DTO 存放于 `dto/requests/`(命名与拆分规则见 [references/dto.md](dto.md) 与 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织))。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| Controller 接收 filter 参数 | `@FilterQuery(cls)` + 类型 `IFilterQuery<T>` |
| Service 接收过滤条件 | `IFilter<T>`(= `IFilterQuery<T>['filter']`) |
| 限制某字段可用操作符 | `@FilterQueryOperators(['eq', 'ne'])` |
| Controller 接收排序参数 | `OrderQueryType(cls)` 派生类 + `@Query()` |
| Controller 接收分页参数 | `@PageQuery(mode?)` / `@OptionalPageQuery(mode?)` + `IPageQuery<T>` |
| Service 分页容器 | `Slice<T>`(`fromOffset` / `fromCursor` / `map`) |
| 路由 ID 校验 | `ParseUUIDv7Pipe` |

## 核心机制

**HTTP 操作符无 `$` 前缀,Controller 内自动加 `$` 前缀**:

```
GET /students?filter={"name":{"eq":"Alice"},"age":{"gte":18}}&orderBy={"age":"desc"}...
query.filter?.name?.$eq === 'Alice'        // 管道已经转换
query.filter?.age?.$gte === 18
```

`filter` 参数可以是 URL 编码的 JSON 字符串,也可以是嵌套对象(qs 风格)。`@FilterQuery` 内部管道:解析 → 用生成的过滤类做 `whitelist + forbidNonWhitelisted` 校验(不合法返回 `BadRequestException`)→ 递归加 `$` 前缀。

## Filter 过滤

### 定义过滤 DTO(约定)

过滤字段的取值 DTO 用 `PartialType(PickType(...))` 派生(DRY + 全可选):

```typescript
import { PartialType, PickType } from '@buka/nestjs-kit'

// 从已有 DTO 选取可过滤字段
export class CourseFilterQueryDto extends PartialType(
  PickType(CourseBriefDto, ['status', 'teacher']),
) {}
```

### Controller 与 Service

```typescript
import { FilterQuery, IFilterQuery, IFilter } from '@buka/nestjs-kit'

@Get()
async listCourses(
  @FilterQuery(CourseFilterQueryDto) query: IFilterQuery<CourseFilterQueryDto>,
) {
  return this.courseService.list(query.filter)   // 把 filter 透传给 service
}

// Service
async list(filter?: IFilter<Course>) {
  return this.repo.findAndCount(filter ?? {}, {})  // filter 直接可用作 MikroORM where
}
```

**类型边界**:Controller 用 `IFilterQuery<T>`(`{ filter?: ... }` 包装),Service 用 `IFilter<T>`(`... | undefined`)。`IFilter<T>` 根据 T 的每个属性**推导**可用操作符:

| 属性类型(来自实体/模型声明) | 可用操作符 |
|---|---|
| 标量(string/number/boolean/Date) | `$eq` `$ne` `$lt` `$gt` `$lte` `$gte` `$in` `$nin` |
| `Ref<Entity>`(关联 to-one) | 以上标量操作符,作用于主键值 |
| `Collection<Entity>` / 数组 | `$some` `$every` `$none`(内嵌嵌套条件对象) |
| 嵌套对象(@Composite/@Model) | 递归展开其属性的操作符 |

集合操作符示例:`GET /books?filter={"chapters":{"some":{"title":{"eq":"序章"}}}}`。

service 入参与 controller 职责的完整约定见 [references/service.md](service.md) 与 [references/controller.md](controller.md)。

### 收窄操作符

```typescript
import { FilterQueryOperators, Model, Property } from '@buka/nestjs-kit'

@Model()
class CourseBriefDto {
  @Property()
  @FilterQueryOperators(['eq', 'ne', 'in'])
  status!: CourseStatus   // 只允许这三种操作符,其余在生成 schema 中剔除、校验时拒绝
}
```

## Order 排序

```typescript
import { OrderQueryType } from '@buka/nestjs-kit'

export class CourseOrderQuery extends OrderQueryType(Course) {}

@Get()
async listCourses(@Query() query: CourseOrderQuery) {
  // query.orderBy === { createdAt: 'desc' }
  // 或数组形式: [{ createdAt: 'desc' }, { id: 'asc' }]
  return this.courseService.list({}, query.orderBy)
}

// Service: orderBy 直接作为 MikroORM orderBy
this.repo.find({}, { orderBy })
```

`IOrderQuery<T>` 的 `orderBy?: QueryOrderMap<T> | QueryOrderMap<T>[]`,只允许模型中声明的字段,JSON Schema 校验由全局验证管道完成。

## 分页

### 参数形态(HTTP → Controller 参数)

| 模式 | HTTP `page` | 管道输出 `page` | 校验规则 |
|---|---|---|---|
| offset | `{ limit, offset }` | `{ limit, offset }`(number 化) | `limit` 正整数,`offset` 非负整数 |
| cursor 向前 | `{ first, after? }` | `{ first, after }` | `first` 正整数;首屏 `after` 可缺省 |
| cursor 向后 | `{ last, before? }` | `{ last, before }` | `last` 正整数 |

- `@PageQuery('offset' | 'cursor')` 限定模式;不传 `mode` 同时支持三种形态
- 混合 offset 与 cursor 参数、或 `after/first` 与 `before/last` 混用 → `BadRequestException`
- `@OptionalPageQuery(mode?)`:不传 `page` 时不报错(`page` 可能为 undefined)
- 参数类型用 `IPageQuery<'offset'>` / `IPageQuery<'cursor'>`(形状 `{ page: {...} }`)

### Service 返回 `Slice<T>`

```typescript
import { Slice } from '@buka/nestjs-kit'
import { Cursor } from '@mikro-orm/core'

// offset 模式
const [items, total] = await this.courseRepo.findAndCount({}, {
  limit: page.page.limit,
  offset: page.page.offset,
})
return Slice.fromOffset(items, total, page.page)  // 参数 { limit, offset }

// cursor 模式(MikroORM v7)
const cursor: Cursor<Course> = await this.courseRepo.findByCursor({}, {
  first: page.page.first,
  after: page.page.after,           // 形如 'tx_offset' 的 opaque cursor;首屏传 undefined
})
return Slice.fromCursor(cursor)
```

### Controller 出参

```typescript
import { ListResponseBodyType, PageQuery, IPageQuery } from '@buka/nestjs-kit'

export class ListCoursesResponseDto extends ListResponseBodyType(CourseBriefDto, 'offset') {}

@Get()
async listCourses(@PageQuery('offset') page: IPageQuery<'offset'>): Promise<ListCoursesResponseDto> {
  const slice = await this.courseService.list(page)
  return ListCoursesResponseDto.fromSlice(slice)   // meta.pagination = { total, limit, offset }
}
```

- `OffsetPagination`:`{ total, limit, offset }`
- `CursorPagination`:`{ total?, limit, startCursor, endCursor, hasNextPage, hasPrevPage }`(`em.findByCursor` 时 `total` 来自 `totalCount`,不查总数时为 undefined)
- 响应包装与 `toJSON` 序列化见 [references/dto.md](dto.md);`Slice.map(item => dto)` 可保留分页信息做元素转换

## 端到端模板

```typescript
// course.controller.ts
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /** 课程列表 */
  @Get()
  async listCourses(
    @FilterQuery(CourseFilterQueryDto) filterQuery: IFilterQuery<CourseFilterQueryDto>,
    @Query() order: CourseOrderQuery,
    @PageQuery() page: IPageQuery,
  ): Promise<ListCoursesResponseDto> {
    const slice = await this.courseService.list({
      filter: filterQuery.filter,
      orderBy: order.orderBy,
      page: page.page,   // controller 负责 DTO 参数 → command 的映射
    })
    return ListCoursesResponseDto.fromSlice(slice)
  }
}

// course.service.ts
// ListCoursesCommand:聚合 filter/orderBy/page 的 command interface(放 commands/ 目录,见 references/service.md)
async list(command: ListCoursesCommand) {
  const { filter, orderBy, page } = command
  // offset 分支
  const [items, total] = await this.repo.findAndCount(filter ?? {}, {
    orderBy,
    limit: page?.limit ?? 20,
    offset: page?.offset ?? 0,
  })
  return Slice.fromOffset(items, total, { limit: page?.limit ?? 20, offset: page?.offset ?? 0 })
}
```

## ParseUUIDv7Pipe

```typescript
@Get(':studentId')
findOne(@Param('studentId', ParseUUIDv7Pipe) studentId: string) {
  // 非 UUIDv7 → BadRequestException('Validation failed (UUIDv7 is expected)')
}
```

## 注意事项

- 分页管道输出形状是 `{ page: {...} }`:`@PageQuery` 参数拿到的是包装对象(`IPageQuery` 类型),传给 service 时取 `page.page`
- `filter` HTTP 传 JSON 字符串时注意 URL 编码(`encodeURIComponent(JSON.stringify(...))`);qs 嵌套对象两种都被支持
- filter 校验在管道内 `whitelist + forbidNonWhitelisted`:传了模型里没有的字段/操作符会整体 400
- cursor 的 `after/before` 是 `Slice.fromCursor` 输出的 `endCursor/startCursor` 原样回传的 opaque 字符串,无需自行拼装
- 过滤字段记得收窄操作符(`@FilterQueryOperators`),状态/枚举类字段通常只需 `eq/in`
- 基础过滤+排序+分页直接用 `findAndCount`/`findByCursor`,无需手写 SQL 或 QueryBuilder
- `FilterQueryType` 工厂是内部实现,**未从包导出**,不要 import 它(公开 API 是 `@FilterQuery` 装饰器 + `IFilter`/`IFilterQuery` 类型)
- Swagger UI 中 object 型 query 参数渲染见 [nestjs-kit-swagger](../../nestjs-kit-swagger/SKILL.md)