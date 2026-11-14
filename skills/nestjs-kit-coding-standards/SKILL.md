---
name: nestjs-kit-coding-standards
description: >
  本 skill 定义 @buka/nestjs-kit 业务代码的文件级编写规范:声明 DTO(@Model/@Property/@Composite/@List/@Dictionary/@Enum、
  PickType/OmitType/PartialType/IntersectionType、ResponseBodyType、EntityDto/@EntityRef/PrimaryKeyType)、
  定义 MikroORM 实体(DiscreteEntity/LinearEntity/TimestampedEntity 基类、Column.*、Cardinality.*)、
  编写 service(command 单参契约、Ref<Entity> 传递、em.flush 事务约定)与 controller(operationId 命名、中文 JSDoc、@IsBrowserRequest)、
  实现 list 查询(@FilterQuery/OrderQueryType/@PageQuery/Slice/ParseUUIDv7Pipe)、
  组织模块目录(features/ 功能分组、src/shared/ 跨模块共享层)与命名。
  当用户编写或修改 .dto.ts/.entity.ts/.service.ts/.controller.ts 文件、
  新增业务模块或 CRUD 接口、移动或重命名业务源码文件时使用本 skill;
  只要在项目中新增或修改 NestJS 业务代码,即使用户未提到具体文件名也应使用。
  异常抛出、日志、加密存储等模块级能力由对应 skill 覆盖,本 skill 只规定代码结构与文件级规范。
---

# nestjs-kit 编写规范(coding standards)

本 skill 规定 @buka/nestjs-kit 业务代码的文件级编写规范,覆盖 DTO、实体、service、controller、list 查询、模块目录组织(features 功能分组)与跨模块共享层(src/shared)。

## 前置条件

以下机制由项目接入阶段统一提供,编写业务文件时直接依赖:

- 请求体校验与转换由全局 `BukaValidationPipe` 执行——`@EntityRef`/`PrimaryKeyType` 字段在管道内自动转成 wrapped `Ref`(细节见 [references/dto.md](references/dto.md))。项目若自定义了 `validation` 选项,其中 `transform` 必须为 `true`。
- `DatabaseConfig` 默认 `flushMode: FlushMode.COMMIT`(查询前隐式 flush 已跟踪变更)。事务提交点在 controller 末尾统一 `em.flush()`(见 [references/controller.md](references/controller.md) 与 [references/service.md](references/service.md))。
- Swagger 文档由 `@nestjs/swagger` CLI 插件从 controller/DTO 元数据生成,`SwaggerPatcher` 只做文档后处理(见 [nestjs-kit-swagger](../nestjs-kit-swagger/SKILL.md))。

## 速查表(跨文件通用规则)

| 要做什么 | 用什么 |
|---|---|
| kit API 导入 | `import { X } from '@buka/nestjs-kit'`(细则见「通用约定·导入来源」);`Ref`/`Collection`/`Cursor`/`EntityManager` 自 `@mikro-orm/core`;`@Entity` 自 `@mikro-orm/decorators/legacy` |
| 声明 service/controller | 普通 `@Injectable()`/`@Controller()` 类,无需继承基类 |
| 请求体校验转换 | 全局 `BukaValidationPipe`(由 `BukaModule` 注册;`@EntityRef` 自动转 wrapped `Ref`) |
| 事务提交 | controller handler 末尾统一 `await this.em.flush()`;service 非计数器等原子场景不 flush |
| 抛出异常 | `@ModuleExceptions` 声明的异常工厂(规范见 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md)) |
| 响应结构 | 统一 `{ data, meta }`:单条 `ResponseBodyType.from()`,列表 `ListResponseBodyType.fromSlice()` |

## references 导航

本 skill 的 references/ 目录按文件类型拆分,按需加载——写某类文件时只读对应的 reference;新增一条完整 CRUD 链路(跨 5 类文件)时才通读全部。

| 要写什么文件 | 读哪个 reference |
|---|---|
| 写 DTO(请求/响应) | [references/dto.md](references/dto.md) |
| 定义实体 | [references/entity.md](references/entity.md) |
| 实现 list 查询(过滤/排序/分页) | [references/query.md](references/query.md) |
| 写 service(业务逻辑) | [references/service.md](references/service.md) |
| 写 controller(HTTP 层) | [references/controller.md](references/controller.md) |
| 文件放在哪个目录、如何命名 | 见下方「业务模块目录组织」与「跨模块共享层」两章 |

## 通用约定(跨文件类型)

以"该事实是否 ≥2 类文件共用"为判据——以下五条红线与一条全局数据流链路对所有文件类型成立:

### 导入来源

kit API 统一从 `@buka/nestjs-kit` 主入口导入;包的 `exports` 只配置了 `.`,不存在子路径导出,`from '@buka/nestjs-kit/mikro-orm'` 等写法会在运行时解析失败。`Ref`/`Collection`/`Cursor`/`EntityManager` 自 `@mikro-orm/core` 导入;`@Entity` 自 `@mikro-orm/decorators/legacy` 导入。

### CRUD 数据流链路

一条完整的 CRUD 链路(请求 DTO → 实体 → 响应 DTO)遵循派生链:派生而非重复声明,数据源唯一,字段变更只改一处。

```
CreateXxxRequestDto(显式声明字段,@Model/@Property/@EntityRef 等)
  → UpdateXxxRequestDto = PartialType(OmitType(CreateXxxRequestDto, [...不可更新字段]))
  → XxxFilterQueryDto = PartialType(PickType(XxxBriefDto, [...可过滤字段]))
  → command interface(聚合 service 入参,放 commands/,见 [references/service.md](references/service.md))
  → 实体(@Entity + Column.*/Cardinality.*,见 [references/entity.md](references/entity.md))
  → XxxBriefDto = EntityDto(Entity) / XxxDetailDto = EntityDto(Entity) 显式补 lazy 字段
  → {Fn}ResponseDto = ResponseBodyType(XxxDetailDto) / ListResponseBodyType(XxxBriefDto, mode)
  → controller 返回 .from(entity) / .fromSlice(slice)
```

### 事务红线

- 提交点在 controller handler 末尾统一 `await this.em.flush()`(见 [references/controller.md](references/controller.md))。
- service 非特殊情况不执行 `em.flush()`(见 [references/service.md](references/service.md))。允许的例外:计数器/序号自增等必须立即落库且与请求成败无关的原子场景,须就地注释理由。
- 一次请求不主动拆多个提交点,保证异常回滚包络完整。

### 异常红线

业务代码统一走 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) 的异常工厂与 `@ModuleExceptions` 声明——错误码可检索、类别可控;裸 `throw new HttpException` 跳过了错误码体系,错误码不可检索且类别不可控。

### @EntityRef 自动转换

请求体中 `@EntityRef`/`PrimaryKeyType` 字段由全局 `BukaValidationPipe` 在运行时转成 `em.getReference(Entity, id)` 的 wrapped `Ref`,到 service 入参时已是可直接使用的 `Ref<Entity>`(见 [references/dto.md](references/dto.md) 的实体派生 DTO 章)。

## 业务模块目录组织

### 目录结构

```
src/modules/<module-name>/
├── <module-name>.controller.ts     # HTTP 控制器
├── <module-name>.module.ts         # NestJS 模块定义
├── <module-name>.exceptions.ts     # 模块专属异常(@ModuleExceptions 集中声明)
├── commands/       # Command interface —— 聚合 service 方法的参数(写法见 references/service.md)
├── constants/      # 枚举和常量
├── decorators/     # 模块内自定义装饰器(可跨模块 import 共享,复用度高的下沉共享层)
├── dto/            # 对外暴露的数据结构
│   ├── requests/   #   请求参数 DTO
│   └── responses/  #   响应体 DTO({FunctionName}ResponseDto extends ResponseBodyType(...))
├── entities/       # MikroORM 实体
├── features/       # 模块内功能分组(按需创建,见下文「features 子目录」)
│   └── <feature-name>/
│       ├── dto/            # 该功能独占的 DTO
│       ├── constants/      # 该功能独占的常量/策略
│       ├── schema/         # 该功能对外的 OpenAPI schema 片段(可选)
│       └── <feature-entry>.ts   # 功能实现入口(如 provider)
├── services/       # 模块自身的业务逻辑(主 service + 按复杂度拆出的 provider;写法见 references/service.md)
├── subscribers/    # MikroORM 订阅者(可选)
├── types/          # 模块内部类型(可跨模块 import 共享)
└── utils/          # 模块内工具函数(可选)
```

### features 子目录

默认仍按文件类型扁平组织;仅当**同一模块承载多个可独立演进的能力**(如一种凭据实现、一个子域)时,才为该能力建 `features/<feature-name>/`,把它的实现、`dto/`、`constants/`、`schema/` 一起收拢。只有一个能力的模块保持扁平,不要预先套壳。

- **判据**:能力自身有独立的对外契约(自己的请求 DTO、策略/常量、schema),且与模块内其它能力可以分别演进;或该能力以插件方式注册(如 `CredentialProvider`),宿主模块不应出现它的类型分支。
- **按能力分组,不按文件类型分组**:是 `features/sms-credential/`,不是 `features/dto/`、`features/services/`;子目录名 kebab-case,用能力名。
- **能力内沿用文件类型目录**:`features/<feature-name>/` 下仍是 `dto/`、`constants/`、`schema/`(可选)加实现入口文件;需要时再加 `commands/`、`services/`、`types/`、`utils/`,不发明新的目录名。
- **只分层一级**:`features/<feature-name>/` 之下不再嵌套 `features/`;能力继续膨胀到需要独立注册时,拆成独立模块。
- **归属与注册**:feature 内不建 `<module-name>.module.ts` 与 controller;宿主模块的 `<module-name>.module.ts` 从 `./features/<feature-name>/...` import 实现,并放进 `providers`/`exports`。
- **对外导入面**:feature 的 `dto/`、`types/`、`schema/` 可被其他模块以完整路径 import(`~/modules/<module>/features/<feature-name>/...`);实现(provider、内部工具)不对外。被多个模块共用、又不属于任何模块的纯契约,按「跨模块共享层」下沉到 `src/shared/`。
- **模块级目录只留公共部分**:`entities/`、模块级 `commands/`、`services/` 与共享常量留在模块根;feature 独占的 DTO、常量/策略、schema 与实现搬进 feature 目录,搬移后删除空目录并更新所有引用路径。

### 各目录职责边界

- **commands/**:只放 `interface`(聚合某个 service 方法的全部参数);不放 handler、不放 DTO。command 的设计与写法见 [references/service.md](references/service.md)
- **constants/**:模块级枚举与常量;某 feature 独占的常量/策略放该 feature 的 `constants/`
- **decorators/**:自定义装饰器(可直接跨模块 import 共享);复用度高的下沉共享层(`src/shared/`,见「跨模块共享层」)
- **dto/**:模块自身(不属于某个 feature)的对外数据结构(请求/响应),内部类型放 `types/`;requests 与 responses 分开放;feature 独占的 DTO 放该 feature 的 `dto/`
- **entities/**:只放 MikroORM 实体
- **features/**:模块内可独立演进能力的收拢目录(如 `sms-credential`),按需创建;创建后该能力的实现、dto、constants、schema 不再散落在模块级目录
- **services/**:模块自身(不属于某个 feature)的业务逻辑;主 service 与按复杂度拆出的子 service/provider 同放此目录——拆分信号与不拆时机见 [references/service.md](references/service.md)(本条目只定目录归属)
- **exceptions** 不建目录:集中一个文件 `<module-name>.exceptions.ts`,所有 `@ModuleExceptions` 声明都写在这里
- **types/**:模块内部类型,可直接跨模块 import 共享;**utils/**:模块私有工具函数,通常不共享,只在有多个文件共用的工具函数时才建

### 拆分原则

- **一个 DTO 一个文件**:每个请求/响应 DTO 独立成文件(`get-student-response.dto.ts`),全部 DTO 集中在一个 `dtos.ts` 里会破坏按需加载与搜索效率
- 一个实体一个文件(`.entity.ts`),一个 controller 一个文件;controller 的方法命名、拆分上限(约 10 个)与职责边界见 [references/controller.md](references/controller.md)
- service 拆分以复杂度为准绳:子资源具备多个功能拆 `XxxSubresourceService`、可独立理解的复杂职责(通知、审计、同步)拆独立 provider、简单 service 不拆;完整信号清单见 [references/service.md](references/service.md)
- 跨模块共享是允许的:entities、装饰器、dto、types 可直接被其他模块 import,features 内的 dto/types/schema 同理;commands、utils 与 feature 的实现属模块私有,通常不共享(确需跨模块复用的纯契约再下沉 `src/shared/`,见「跨模块共享层」)
- 能力分组按需引入:模块内出现第二个可独立演进的能力时才建 `features/`,把该能力的文件整体搬入并更新所有引用路径(含跨模块的完整路径);只有一个能力时保持扁平
- 共享层按真实复用提取:能力先留在模块内,确认第二个模块也要用时才下沉到 `src/shared/<name>/`;不要因为"将来可能复用"提前抽象

### 命名约定

- 文件名 kebab-case,类名 PascalCase,一一对应(`GetStudentResponseDto` → `get-student-response.dto.ts`)
- 目录名 kebab-case、用能力名:`features/sms-credential/`、`src/shared/access-token-claims/`;不用 `dtos/`、`utils/`、`common/` 这类泛型名
- MikroORM 仓储注入(`@InjectRepository(X)`)的属性命名:`{EntityName}Repo`(如 `courseRepo`、`enrollmentRepo`),不写 `courseRepository`、`repo` 等变体
- 变量与属性命名使用完整单词,禁止自造无法识别含义的极简缩写——如把 `ServiceDescriptor` 缩成 `sd`、把 `service` 缩成 `svc`;规范中已约定的惯用缩写(`em`、`id`、`url` 等)除外
- Controller 方法命名(operationId = 动词 + 资源名、全局唯一)、路由参数命名(`:studentId`)与中文 JSDoc 约定见 [references/controller.md](references/controller.md)

## 跨模块共享层

`src/shared/<name>/` 与 `src/modules/` 平级,存放**被 ≥2 个模块共用、且不属于任何一个模块的纯契约**;模块内部仍按文件类型组织,只有真正跨模块复用时才下沉到这里。

### 目录结构

```
src/shared/<name>/
├── index.ts        # 唯一出口,只 re-export 公开契约
├── <name>.ts       # 契约主体:接口/类型/纯函数
├── <name>.dto.ts   # wire 表示(需要进入 Swagger/SDK 时)
└── *.spec.ts       # 与实现同目录
```

目录内可按主题拆多个文件(如契约主体、`projections.ts`、附加 DTO),但对外只经 `index.ts` 暴露。

### 判据与边界

- **下沉判据**:同一契约/能力被 ≥2 个模块引用,且责任不属于其中任何一个模块;只有一个模块使用时留在该模块(可用模块内 `types/`、`utils/` 或 feature 目录)。
- **只放纯契约**:类型、接口、DTO、常量、纯函数与框架无关的 Error 类;带状态、带 DI、带生命周期的东西不进来——`@Injectable()` provider、`@Module`、controller、ORM 实体都不放。
- **依赖方向单向**:shared 只依赖 `@buka/nestjs-kit`、SDK 与第三方包,**禁止 import `~/modules/**`**;否则模块与共享层互相依赖,抽取即产生循环。
- **一个能力一个子目录**:`src/shared/<name>/` 对应一个内聚契约(如 `access-token-claims`);不建 `src/shared/utils/`、`src/shared/common/` 这类大杂烩目录,第二个不相关能力出现时新开子目录。
- **唯一出口**:目录内 `index.ts` 汇总公开符号;其他模块一律 `import { X } from '~/shared/<name>'`,不深入具体文件(目录内部文件之间才用相对路径 import)。
- **与 features 的分工**:`features/` 属于模块内部,所有权在宿主模块;`shared/` 不属于任何模块,是模块之间的公共契约层。两者都不是"暂时没地方放"的收容所。

### 命名约定

- 子目录名 kebab-case、用能力名(`access-token-claims`),不用文件类型名
- `index.ts` 只做 re-export,不写实现;DTO 的 wire 表示用 `<name>.dto.ts`

## 注意事项

- DTO 应放入对应子目录:`requests/` 用于请求参数,`responses/` 用于响应体——两者混放会破坏对外结构的一致性
- `features/` 是模块内分组而非拆模块:不新增 NestJS 模块与 controller,注册与导出仍由宿主模块负责
- `src/shared/` 只放跨模块纯契约,不放"什么都能塞"的公共工具箱;只有一个模块使用的能力留在模块内
- 移动/重命名文件时同步检查:类名与文件名的一一对应、operationId 是否仍全局唯一、JSDoc 是否随迁、command→DTO 映射是否同步(operationId/JSDoc 规则见 [references/controller.md](references/controller.md))

## 相关 skills

- [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) — 异常工厂与错误码体系(异常红线运行时来源)
- [nestjs-kit-urn](../nestjs-kit-urn/SKILL.md) — URN 格式规范(`@IsUrn`/`@IsDomainUrn`/`@MatchesUrn` 的语义背景)
- [nestjs-kit-swagger](../nestjs-kit-swagger/SKILL.md) — Swagger 文档后处理与 CLI 插件配置
- [nestjs-kit-crypto](../nestjs-kit-crypto/SKILL.md) — 信封加密 / 盲索引 / 加盐哈希(加密字段用 `Column.Embedded` 嵌入实体)
- [nestjs-kit-logger](../nestjs-kit-logger/SKILL.md) — LoggerModule、@InjectLogger
- [nestjs-kit-http](../nestjs-kit-http/SKILL.md) — keq 服务间调用的错误处理
- [nestjs-kit-object-storage](../nestjs-kit-object-storage/SKILL.md) — S3 兼容对象存储
- [nestjs-kit-open-bao](../nestjs-kit-open-bao/SKILL.md) — OpenBao/Vault 集成