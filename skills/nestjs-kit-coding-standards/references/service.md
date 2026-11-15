# Service 编写与事务约定(业务逻辑层)

> 本文件是 [编码规约](../SKILL.md) 的按需加载部分(写 service 时读本文件)。导入来源、事务与异常等硬红线见 [SKILL.md 「硬红线」章](../SKILL.md#硬红线跨文件通用);目录归属见 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织)。

## 前置条件

- 实体已通过 `MikroOrmModule.forFeature([...])` 注册(BukaModule 已注册全局 `BukaValidationPipe`)。
- 请求体嵌套对象已由 `BukaValidationPipe` 转成 wrapped `Ref`(机制见 [SKILL.md 前置条件](../SKILL.md#前置条件),细节见 [references/dto.md](dto.md) 的实体派生 DTO 章)。
- 事务提交点在 controller 末尾统一 `em.flush()`(见 [references/controller.md](controller.md));service 只在例外场景 flush(见下方「em.flush 与事务约定」)。

## 命名与放置

- `services/<module-name>.service.ts` 主 service
- `services/<subresource>.service.ts` 子 service
- `commands/<action>.command.ts`(只放 interface,不放 handler)
- 模块按能力分组时,该能力的 service/provider 放 `features/<feature-name>/`(见 [SKILL.md 「features 子目录」](../SKILL.md#features-子目录))
- 目录归属与命名约定见 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织)

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 声明 service | 普通 `@Injectable()`(无需继承基类) |
| 注入 EntityManager | `constructor(private readonly em: EntityManager)`(`@mikro-orm/core`) |
| 获取仓储 | `@InjectRepository(X)` 或 `this.em.getRepository(X)`;注入属性命名 `{EntityName}Repo`(如 `courseRepo`,见 [SKILL.md 命名约定](../SKILL.md#命名约定)) |
| 公共方法参数 | 只允许一个参数——多参聚合为 command interface(放 `commands/`) |
| 传递实体引用 | `Ref<Entity>`(`@mikro-orm/core`),非特殊情况不传 Entity 裸对象 |
| 提交事务 | 非特殊情况不执行 `em.flush()`——提交点在 controller 末尾 |
| 依赖注入 | constructor 注入 `em` + 协作 service(由 NestJS DI 完成实例化) |

## 基本形态

service 是业务逻辑的唯一所在,不写 HTTP 包装、不做参数校验(已由 BukaValidationPipe 完成)、不直接操作 controller 特有的装饰器。一个公共方法一个职责;返回业务结构(实体 / `Slice<T>` / 数据值)而非 `{ data, meta }` 包装。

```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@mikro-orm/nestjs'
import { EntityManager, EntityRepository, Ref } from '@mikro-orm/core'
import { Course, Enrollment } from '../entities'

@Injectable()
export class CourseService {
  constructor(
    private readonly em: EntityManager,
    private readonly courseRepo: EntityRepository<Course>,
    private readonly notificationService: NotificationService, // 协作 service
  ) {}

  async enrollStudent(command: EnrollStudentCommand): Promise<Enrollment> {
    const enrollment = this.em.create(Enrollment, {
      course: command.course,   // command.course 已是 wrapped Ref<Course>
      student: command.student, // 同上
      source: command.source,
    })
    this.em.persist(enrollment)
    // 不在此处 flush——提交点在 controller 末尾
    return enrollment            // 追踪的实体,controller flush 后落库
  }
}
```

## service 拆分设计(按复杂度)

不以"聚合编排"为唯一职责——拆分准绳是**复杂度**,简单 service 不拆。

### 拆分信号(满足任一即考虑拆分)

| 信号 | 拆分方式 |
|---|---|
| 子资源具备多个功能(如课程报名包含报名/取消/查询/审批) | 独立 `XxxSubresourceService`(如 `CourseEnrollmentService`) |
| 可独立理解的复杂职责(通知发送、审计日志、外部同步) | 独立 provider(`@Injectable()`),由主 service 注入 |
| 公共方法逼近 10 个,且可按资源/职责切出明确主题组 | 按主题拆子 service |
| 单文件数百行仍持续膨胀 | 切分 |
| 多模块共需的能力(如权限判断、ID 生成) | 下沉到 `src/shared/<name>/`(见 [SKILL.md 「跨模块共享层」](../SKILL.md#跨模块共享层)) |

### 不拆信号(保持单 service)

| 信号 | 做法 |
|---|---|
| service 简单:三五个方法、逻辑直白 | 保持单 service |
| 只是同一资源 CRUD 变体(增删改查 + 一二个衍生查询) | 同 service 多方法即可 |
| 仅单个方法"看起来复杂" | 提取私有辅助函数,不拆新 service |
| 子资源只有一个功能 | 一个方法留在主 service |

### 命名与注入

- controller 注入主 service;按子资源拆 controller 时对应注入子 service(见 [references/controller.md](controller.md))
- 子 service 间尽量不互注,跨 service 协作由主 service 编排

## command 设计

**每个 public 方法只允许一个参数**(无参也不写裸多参)。多参聚合为 command interface,放 `commands/` 目录,只放 interface,不放 handler 或 DTO。

```typescript
// commands/enroll-student.command.ts
import type { Ref } from '@mikro-orm/core'
import type { Course, Student } from '../entities'

export interface EnrollStudentCommand {
  /** 课程 */
  course: Ref<Course>
  /** 学生 */
  student: Ref<Student>
  /** 报名来源 */
  source: EnrollSource
}
```

**参数含 Entity 时非特殊情况传 `Ref<Entity>`**(`Ref` 自 `@mikro-orm/core` 导入——kit 不重导出)。与 DTO 的衔接:请求体中的 `@EntityRef`/`PrimaryKeyType` 字段已被 `BukaValidationPipe` 转为 wrapped `Ref`,controller 原样放入 command;路径参数引用的实体用 `this.em.getReference(Course, courseId, { wrapped: true })` 转成 wrapped `Ref` 再放进 command。

**command 与 DTO 的边界**:DTO 是 HTTP 层带校验装饰器的对象(`dto/requests/`),command 是 service 层的入参契约(`commands/`),controller 负责 DTO → command 的映射。

## em.flush 与事务约定

**service 非特殊情况不执行 `em.flush()`**。提供 `DatabaseConfig` 默认 `flushMode: FlushMode.COMMIT`(查询前隐式 flush 已跟踪变更)让实体追踪无需手动 flush,一次请求一个提交单元,controller 末尾统一提交(见 [references/controller.md](controller.md))。

**允许的例外**:计数器/序号自增等必须立即落库且与请求成败无关的原子场景,须就地注释理由:

```typescript
// 必须立即落库以防并发冲突
const counter = await this.em.findOneOrFail(Counter, { key: 'invoice' })
counter.value += 1
await this.em.flush()   // 例外:计数器自增须立即落库
return counter.value
```

service 只通过 `em.create`/`em.persist`/`em.remove` 跟踪变更,把"何时提交"交给 controller。

## 注意事项

- `Ref` 自 `@mikro-orm/core` 导入——kit 不重导出
- command 只放 interface(枚举/常量放 `constants/` 目录)
- 改 command 字段时同步 controller 映射
- service 入参一律经 command 显式声明,单方法只接受一个参数
- 返回业务结构不返回 HTTP 包装(`{ data, meta }` 包装在 controller 侧完成)
- 例外 flush 必须注释理由
- 移动/重命名文件时同步检查清单见 [SKILL.md 注意事项](../SKILL.md#注意事项)