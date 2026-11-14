# DTO 与响应体(Model 体系)

> 本文件由 [nestjs-kit-coding-standards/SKILL.md](../SKILL.md) 按需加载(写/改 DTO 时读本文件)。导入来源、事务与异常红线等通用约定见 [SKILL.md 「通用约定」章](../SKILL.md#通用约定跨文件类型);目录归属见 [SKILL.md 「目录组织」章](../SKILL.md#业务模块目录组织)。

## 前置条件

`@EntityRef`/`PrimaryKeyType` 的运行时自动转换(请求体嵌套对象 → MikroORM `Ref`)由全局 `BukaValidationPipe` 执行(机制见 [SKILL.md 前置条件](../SKILL.md#前置条件))。项目若自定义了 `validation` 选项,其中 `transform` 必须为 `true`,否则转换被跳过——受影响字段拿到的只是普通 `{ id }` 对象。

## 命名与放置

- 请求 DTO 放 `<module>/dto/requests/`,响应 DTO 放 `<module>/dto/responses/`;跨模块共享的纯契约放 `src/shared/<name>/`(见 [SKILL.md 「跨模块共享层」章](../SKILL.md#跨模块共享层)),feature 独占的 DTO 放该 feature 的 `dto/`(见 [SKILL.md 「features 子目录」](../SKILL.md#features-子目录))。目录规范见 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织)
- **一个 DTO 一个文件**,文件名与类名一一对应:`CreateStudentRequestDto` → `create-student-request.dto.ts`
- 请求命名:`CreateXxxRequestDto` / `UpdateXxxRequestDto` / `XxxFilterQueryDto`;响应命名:`{FunctionName}ResponseDto`(pack 一个 `ResponseBodyType(...)`),列表元素用 `XxxBriefDto` / `XxxDetailDto`

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 标记一个 DTO 类 | `@Model()`(字段装饰器使用后也会隐式注册,但显式标注可读性好) |
| 标量字段 | `@Property({ optional?, schema? })` |
| 嵌套对象字段 | `@Composite({ type: () => Dto })` |
| 数组字段 | `@List({ type: String \| () => Dto })` |
| 字典字段 | `@Dictionary({ type, map? })` |
| 枚举字段 | `@Enum({ type: () => EnumObj })` 或 `@Enum({ values: [...] })` |
| 选取/排除字段派生 | `PickType(Dto, keys)` / `OmitType(Dto, keys)` |
| 全部字段可选 | `PartialType(Dto)` |
| 合并多个 DTO | `IntersectionType(A, B, ...)` |
| 单条响应包装 | `ResponseBodyType(Dto)`(`.from(data)`) |
| 列表响应包装 | `ListResponseBodyType(Dto, mode?)`(`.fromSlice(slice)`) |
| 从实体派生响应 DTO | `EntityDto(Entity)` |
| 仅主键的实体引用 | `PrimaryKeyType(Entity)` 或 `@EntityRef(() => Entity)` |
| URN 字段校验 | `@IsUrn()` / `@IsDomainUrn()` / `@MatchesUrn(pattern)` |

## @Model 装饰器体系

### @Model

```typescript
@Model()                                            // 基础
@Model({ schema: { additionalProperties: false } }) // 仅 OpenAPI 文档层禁额外属性
@Model({ additionalProperties: true })              // 运行时序列化保留未注册字段
@Model({ additionalProperties: () => SomeModel })   // 额外字段按 SomeModel 元数据递归序列化
```

两个 `additionalProperties` 是不同层:模型级影响**运行时序列化**;`schema.additionalProperties` 只影响 **OpenAPI 文档**。二者都不被转换器继承(见注意事项)。

### 字段装饰器

```typescript
import { Model, Property, Composite, List, Dictionary, Enum } from '@buka/nestjs-kit'

@Model()
class StudentProfile {
  @Property({ schema: { type: 'string', description: '昵称' } })
  nickname!: string

  @Property({ optional: true })
  age?: number
}

@Model()
class CreateStudentRequestDto {
  @Property()
  name!: string

  @Composite({ type: () => StudentProfile, optional: true })
  profile?: StudentProfile

  @List({ type: String })
  tags!: string[]

  @List({ type: () => CourseRef })
  courses!: CourseRef[]

  @Dictionary({ type: String })
  labels!: Record<string, string>

  @Enum({ type: () => Gender })
  gender!: Gender
}
```

各装饰器自动应用的校验/Swagger 规则:

| 装饰器 | 必填(默认) | 可选(`optional: true`) | Swagger | 备注 |
|---|---|---|---|---|
| `@Property` | —(标量自身无校验) | `@IsOptional` | `@ApiProperty(schema)` / `@ApiPropertyOptional` | `schema` 未传时不生成 ApiProperty;标量校验自行叠加(`@IsEmail` 等) |
| `@Composite` | `@ValidateNested` + `@Type(() => T)` + `@IsNotEmpty` | + `@IsOptional` | `@ApiProperty({ type })` | `type` 必填,函数形式防循环引用 |
| `@List` | 标量:`@IsArray` + 标量校验 `{ each: true }`;对象:`@ValidateNested({ each: true })` + `@Type` | + `@IsOptional` | `isArray: true` | 标量类型直接传 `String`/`Number`/`Boolean` |
| `@Dictionary` | `@IsObject` + `IsScalarDictionary`/`ValidateNestedDictionary` | + `@IsOptional` | `type: 'object', additionalProperties` | `map: true` 切 Map 模式,错误路径更完整(`addresses.home.city`) |
| `@Enum` | `@IsEnum(obj)`(type 形式)或 `@IsIn(values)`(values 形式) | + `@IsOptional` | 枚举 schema(`enumName` 生成命名引用) | `type` 与 `values` 二选一 |

选项通用:`optional`、`lazy`(懒加载:不注册 Swagger schema,用于 detail 接口需显式声明的字段)、`schema`(透传 `ApiPropertyOptions`)、`association`(业务层不手动设置,由 `Cardinality.*` 注入)。

## 派生转换器

```typescript
import { PickType, OmitType, PartialType, IntersectionType } from '@buka/nestjs-kit'

// 创建:从基础模型选取字段,显式声明
class CreateStudentRequestDto extends PickType(StudentBase, ['name', 'age']) {}

// 更新:所有字段可选
class UpdateStudentRequestDto extends PartialType(OmitType(CreateStudentRequestDto, ['course'])) {}

// 合并
class StudentBriefDto extends IntersectionType(StudentNameDto, StudentRelationDto) {}
```

- `PickType/OmitType` 要求源类已注册 `@Model`(否则 `TypeError`);`PartialType` 不强制,但未注册则拿不到元数据
- 派生类自动继承 Swagger / class-validator / class-transformer 元数据;`@Model` 的 `schema` 与 `additionalProperties` 配置**不继承**,需在派生类上重写
- 优先派生,派生链见 [SKILL.md 「CRUD 数据流链路」章](../SKILL.md#crud-数据流链路)

## 响应体包装

结构统一 `{ data, meta }`:

```typescript
import { ResponseBodyType, ListResponseBodyType } from '@buka/nestjs-kit'

class GetStudentResponseDto extends ResponseBodyType(StudentDetailDto) {}
class ListStudentsResponseDto extends ListResponseBodyType(StudentBriefDto, 'offset') {}

// Controller
return GetStudentResponseDto.from(studentDetail)
return ListStudentsResponseDto.fromSlice(slice)   // Slice 见 [references/query.md](query.md)
const body: GetStudentResponseDto = {
  data: studentDetail,
  meta: { /* 任意扩展 */ },
}
```

- `ListResponseBodyType(Dto, mode)`:`'offset'` → `meta.pagination` 为 `OffsetPagination`;`'cursor'` → `CursorPagination`
- 包装类内置 `toJSON()`:按 `@Model` 元数据**递归序列化** `data`。实体可直接放入——已 populate 的关联完整序列化、未 populate 的 `Ref` 输出 `{ id }`、lazy 集合自动忽略,无需手写 plainToClass/删字段

## 实体派生 DTO

```typescript
import { EntityDto, PrimaryKeyType, EntityRef, List, Property } from '@buka/nestjs-kit'

// 基础 DTO:自动排除 lazy 属性(OneToMany/ManyToMany 集合、lazy 标量列)
class CourseBriefDto extends EntityDto(Course) {}

// 详情 DTO:把 lazy 属性显式加回
class CourseDetailDto extends EntityDto(Course) {
  @Property({ schema: { description: '课程大纲' } })
  outline?: string

  @List({ type: () => PrimaryKeyType(Student) })
  students!: IEntityPrimaryKey<Student>[]
}
```

- `EntityDto(Entity)` 生成**不继承实体**的独立类(避免与 `Collection<T>` 类型冲突),类型转换:`Collection<E>` → 剔除;`Ref<E>` → 保留;`Xxx & Opt` → `Xxx | undefined`
- detail 接口配套:service 侧显式 `populate` 对应懒加载字段,保证运行结果与类型一致
- `PrimaryKeyType(Entity)`:WeakMap 缓存的 `{ id }` DTO 类(类型 `IEntityPrimaryKey<Entity>`);`@EntityRef(() => E)` 是其 `@Composite` 快捷写法,请求中「只传 ID 的嵌套对象」用它:

```typescript
@Model()
class CreateStudentRequestDto {
  @EntityRef(() => Course, { optional: false })
  course!: IEntityPrimaryKey<Course>
}
```

- **运行时自动转换**:`BukaValidationPipe` 把请求体中 `PrimaryKeyType`/`@EntityRef` 嵌套对象转成 `em.getReference(Entity, id)` 的 wrapped `Ref`,service 直接可用(见 [SKILL.md 前置条件](../SKILL.md#前置条件))

## 内置 class-validator 装饰器

| 装饰器 | 用途 |
|---|---|
| `@IsUrn()` | 字符串是合法 `urn:buka:*`(任意层级) |
| `@IsDomainUrn()` | 概念域级 URN(无 resource),如 aud 字段 |
| `@MatchesUrn('urn:buka:galaxy:client:*')` | 匹配指定 URN 模式(`*`/`**` 通配符) |
| `@HasAnyKey(['name', 'email'])` | 对象至少含所列 key 之一 |
| `@MatchJsonSchema(schema)` | 属性值匹配给定 JSON Schema(json-schema 校验) |
| `@IsCrockfordBase32()` | Crockford Base32 字符串 |
| `@IsEnumColumn(items)` | 枚举列取值校验(Column.Enum 默认自动应用) |
| `@IsScalar(ctor, each)` / `@IsScalarDictionary(ctor)` | 标量/标量字典(`String`/`Number`/`Boolean`) |
| `@ValidateNestedDictionary(() => T)` | 对象字典嵌套校验(`@Dictionary` 自动应用) |

标量字段的常见校验(`@IsEmail`、`@IsNotEmpty`、`@Min` 等 class-validator 原生装饰器)直接叠在 `@Property` 旁即可。URN 格式的语义背景见 [nestjs-kit-urn](../../nestjs-kit-urn/SKILL.md)。

## 序列化工具

- `serializeModel(value, Class)`:按类上注册的 `@Model` 元数据递归序列化(包装类内置 toJSON 的底层能力)
- `stableStringify(value)`:键排序稳定 JSON 序列化(用于缓存的 cache key、盲索引输入等)

## 注意事项

- 响应中关联资源默认返回 `Ref` 引用(`{ id }`,由 `EntityDto`/Ref 序列化自动得到),不嵌套完整子资源;例外:值对象、高一致性诉求(此时用 `IntersectionType` + 显式声明嵌套)
- CRUD 全链路派生链见 [SKILL.md 「CRUD 数据流链路」章](../SKILL.md#crud-数据流链路)
- `@Property` **不自动做 `@IsString`**:标量校验须自行叠加 class-validator 装饰器(实体列由 Column 装饰器自动校验,见 [references/entity.md](entity.md))
- 直接 `extends SomeEntity` 声明响应 DTO 会与 `Collection` 类型冲突——用 `EntityDto`
- `schema.additionalProperties: false` 只是文档层禁额外字段;运行时拦截由全局验证管道的 `whitelist`/`forbidNonWhitelisted` 完成