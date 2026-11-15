# Controller 编写与事务提交(HTTP 层)

> 本文件是 [编码规约](../SKILL.md) 的按需加载部分(写 controller 时读本文件)。导入来源、事务与异常等硬红线见 [SKILL.md 「硬红线」章](../SKILL.md#硬红线跨文件通用);目录归属见 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织)。

## 前置条件

- 业务逻辑在 service 层(见 [references/service.md](service.md))——controller 只做参数装配、服务调用与响应构造。
- 请求体的校验与转换由全局 `BukaValidationPipe` 完成(由 `BukaModule` 注册,见 [references/dto.md](dto.md) 的实体派生 DTO 章)。
- Swagger 文档由 `@nestjs/swagger` 的 CLI 插件从 controller/DTO 生成(见 [nestjs-kit-swagger](../../nestjs-kit-swagger/SKILL.md))。

## 命名与放置

```
src/modules/<module-name>/<module-name>.controller.ts    # 主 controller
src/modules/<module-name>/<subresource>.controller.ts    # 拆出的子 controller
```

目录与文件命名见 [SKILL.md 「业务模块目录组织」章](../SKILL.md#业务模块目录组织)(一个 controller 一个文件)。

## 速查表

| 要做什么 | 用什么 |
|---|---|
| 声明控制器 | `@Controller('courses')`(路径用复数资源名词) |
| 命名 handler | 动词 + 资源名(`getCourse`/`listCourses`/`enrollStudent`),全局唯一作为 operationId |
| 文档标题与描述 | 每个 handler 的中文 JSDoc(Swagger plugin 提取) |
| 浏览器/服务端区分 | `@IsBrowserRequest() isBrowser: boolean` |
| 提交事务 | handler 末尾 `await this.em.flush()` |
| 构造响应 | `XxxResponseDto.from(...)` / `ListResponseBodyType.fromSlice(...)`(见 [references/dto.md](dto.md)) |
| 列表参数 | `@FilterQuery`/`@PageQuery`(见 [references/query.md](query.md)) |
| 路由 ID 校验 | `ParseUUIDv7Pipe`(见 [references/query.md](query.md)) |

## 基本形态

controller 只做三件事:参数装配(含路径参数转 `Ref`)、调用 service、用响应包装类构造响应。不写业务逻辑、不直接操作仓储、不做内容分支(`@IsBrowserRequest` 的格式差异化除外)。

```typescript
import { Body, Controller, Param, Post } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { ParseUUIDv7Pipe } from '@buka/nestjs-kit'

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly em: EntityManager,
  ) {}

  /** 学生报名课程 */
  @Post(':courseId/enrollments')
  async enrollStudent(
    @Param('courseId', ParseUUIDv7Pipe) courseId: string,
    @Body() body: EnrollStudentRequestDto,
  ): Promise<EnrollStudentResponseDto> {
    const enrollment = await this.courseService.enrollStudent({
      course: this.em.getReference(Course, courseId, { wrapped: true }),
      student: body.student,   // @EntityRef 字段已被 BukaValidationPipe 转为 wrapped Ref
      source: body.source,
    })
    await this.em.flush()      // 请求工作单元:末尾统一提交
    return EnrollStudentResponseDto.from(enrollment)
  }
}
```

参数装配中,路径参数引用的实体用 `em.getReference(X, id, { wrapped: true })` 转成 wrapped `Ref` 再放进 command,与 [references/dto.md](dto.md) 中请求体 `@EntityRef` 字段的管道转换保持一致;响应包装 `.from()/.fromSlice()` 见 [references/dto.md](dto.md) 与 [references/query.md](query.md)。

## 路由与命名约定

- handler 方法名全局唯一,同时作为 Swagger operationId;格式 `动词 + 资源名`(`getCourse`、`listCourses`、`enrollStudent`、`removeCourse`)。全项目任何两个 controller 不得有同名方法
- 路由参数用完整命名 `:courseId`、`:studentId`,禁止裸 `:id`
- 每个 handler 必须有中文 JSDoc:Swagger plugin 提取为 operation 的标题与描述,这是文档标题的统一来源,不要另写重复的 `@ApiOperation`
- 路径用复数资源名词;子资源用嵌套路由(`courses/:courseId/enrollments`)

## controller 拆分

- 接口方法保持约 10 个以内;接近/超过上限、或出现清晰子资源主题(如课程报名、课程考核)时,按子资源拆出新的 controller 文件(`course.enrollment.controller.ts`),与 [references/service.md](service.md) 的子 service 拆分配套——拆出的 controller 注入对应子 service
- 拆分只改变 HTTP 层的文件归属,不改变每个 handler 自身的约定(唯一 operationId、中文 JSDoc、末尾 flush)

## @IsBrowserRequest(浏览器请求判定)

参数装饰器 `@IsBrowserRequest()` **只检查 `Sec-Fetch-Site` 头**,为装饰的参数注入 `boolean`。之所以只看这一个头:Node.js 的 undici(`globalThis.fetch`) 会自动发送 `Sec-Fetch-Mode: cors` 但**不发送 `Sec-Fetch-Site`**,因此 `Sec-Fetch-Site` 能区分真实浏览器与服务端 fetch 调用。

```typescript
import { IsBrowserRequest } from '@buka/nestjs-kit'

@Get('me')
getMe(@IsBrowserRequest() isBrowser: boolean) {
  return isBrowser ? viewDto : dataDto   // 内容格式差异化
}
```

用于内容格式差异化(浏览器返回页面视图、API 调用返回 JSON 数据)。客户端可以手动伪造该头,**不能用于安全鉴权**,仅 HTTP 传输有效。

## 事务边界(controller 末尾 em.flush)

controller 是请求工作单元的提交点:

- handler 末尾统一 `await this.em.flush()`,把本次请求产生的持久化变更收敛到一次提交
- 例外(计数器/序号自增等必须立即落库的原子场景)由 service 内显式 flush(见 [references/service.md](service.md));controller 末尾的统一 flush 不因例外取消
- 一次请求不主动拆多个提交点,保证异常路径下回滚包络完整

## 注意事项

- 业务逻辑下沉 service(见 [references/service.md](service.md)),`@IsBrowserRequest` 的格式差异化除外
- `@IsBrowserRequest` 用于内容差异化,不用于安全鉴权
- 响应统一用 `.from()/.fromSlice()` 构造(见 [references/dto.md](dto.md)),保持 `{data, meta}` 结构一致
- 方法重命名/迁移时同步 JSDoc 与 operationId 检查(重命名同步检查清单见 [SKILL.md 注意事项](../SKILL.md#注意事项))