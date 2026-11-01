---
name: nestjs-kit-swagger
description: >
  本 skill 覆盖 @buka/nestjs-kit 的 Swagger 文档修补。当用户遇到 Swagger UI 中 object 型 query 参数
  渲染成手敲 JSON 文本框、需要统一异常响应文档(unifyExceptionResponses)、
  配置 SwaggerPatcher(deepObjectifyQueries/unifyExceptionResponses)、
  按项目实际暴露状态码裁剪 insert 列表,或某端点错误体不符合统一信封需要豁免时使用本 skill。
  SwaggerPatcher 只做文档层后处理、不改变运行时校验;运行时错误响应来自 nestjs-kit-exception,
  @FilterQuery/@PageQuery 的 Swagger 声明随 nestjs-kit-coding-standards 生成。
---

# Swagger 文档修补(SwaggerPatcher)

文档由 `@nestjs/swagger` 的 CLI 插件在编译期生成,`SwaggerPatcher` 在 `createDocument` 之后做文档后处理,两者作用于不同阶段。

## 管线约定

`SwaggerPatcher` 是**纯文档层后处理**(只影响生成的 OpenAPI 文档,不影响运行时行为),在 `createDocument` 之后、`setup` 之前执行:

```typescript
import { SwaggerPatcher } from '@buka/nestjs-kit'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

const document = SwaggerModule.createDocument(app, new DocumentBuilder().build())

SwaggerPatcher.deepObjectifyQueries(document)
SwaggerPatcher.unifyExceptionResponses(document, {
  overwrite: ['4xx', '5xx'],
  insert: [401, 403, 500],
})

SwaggerModule.setup('/swagger/ui', app, document)
```

两个 patch 函数无状态、幂等,重复执行安全;按约定只在 main.ts 文档管线执行一次(与 [coding-standards 的 references/query.md](../nestjs-kit-coding-standards/references/query.md) 及 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) 生成的参数与响应配套)。

## deepObjectifyQueries

解决 filter/page 这类对象型 query 参数的渲染问题:对 `in: 'query'`、schema 是 object/array、且未显式设置 `style`(且 `explode` 未显式 false)的参数,注入 `"style": "deepObject"`。

效果:Swagger UI 把 `?filter={"status":{"eq":"active"}}` 类的参数渲染成 `?filter[status][eq]=active` 的可填写表单,而不是一个只能手敲 JSON 的文本框。与 `@FilterQuery`/`@PageQuery` 自动注册的 `ApiQuery` schema 天然配套。

## unifyExceptionResponses

把统一异常响应结构注入文档:

- `components.schemas.ExceptionResponse`:与 [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) 的响应 `{ error: { code, message, details } }` 一致
- `components.responses`:注册可复用的响应对象
- 按 options 修改每个 operation 的 responses:

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `overwrite` | `('4xx' \| '5xx' \| 'default' \| number)[]` | `[]` | 覆写已有响应为 ExceptionResponse |
| `insert` | `(number \| 'default')[]` | `[]` | 插入新状态码响应(已存在也覆盖) |
| `filter` | `(context: { pathname, method, operation }) => boolean` | `undefined` | 返回 `false` 的 operation 完全跳过(既不覆写也不插入) |

```typescript
SwaggerPatcher.unifyExceptionResponses(document)                              // 仅注册组件
SwaggerPatcher.unifyExceptionResponses(document, { insert: [401, 403, 500] }) // 全量插入
SwaggerPatcher.unifyExceptionResponses(document, { overwrite: ['4xx', '5xx'] }) // 统一现有错误响应
// 组合:覆写 5xx + 插入 401/403
SwaggerPatcher.unifyExceptionResponses(document, { overwrite: ['5xx'], insert: [401, 403] })
```

### 协议端点豁免

错误体遵循其他规范的端点(OAuth2 token、健康检查等)不应被统一为 Buka 信封。在 controller 方法上添加 `@SkipUnifiedExceptionResponse()`:

```typescript
import { SkipUnifiedExceptionResponse } from '@buka/nestjs-kit'
import { ApiResponse } from '@nestjs/swagger'

@Post('token')
@SkipUnifiedExceptionResponse()
@ApiResponse({ status: 400, type: OAuth2ErrorResponseDto })
@ApiResponse({ status: 401, type: OAuth2ErrorResponseDto })
exchangeToken() {}
```

- 装饰器写入 `x-buka-skip-unified-exception-response: true`;标记在 controller 类上时对该类所有 operation 生效
- 被跳过的 operation 不会被 `overwrite`/`insert` 修改,需自行用 `@ApiResponse` 声明错误响应
- `components` 中的 `ExceptionResponse` 仍会注册(全局组件,与具体 operation 无关)
- 无法修改 controller 的 operation(第三方模块等)用 `filter` 豁免:`filter: ({ pathname }) => pathname !== '/health'`

## 注意事项

- 只影响**文档**,不改变运行时——运行时校验还是全局验证管道的职责
- 被豁免的 operation 在文档里没有错误响应,必须补 `@ApiResponse`,否则客户端生成器拿不到错误类型
- 服务多了以后文档体积会大,`unifyExceptionResponses` 的 `insert` 列表按项目真实暴露的状态码裁剪(如认证豁免的接口可不插 401)
- CLI 插件的 `dtoFileNameSuffix` 配置(见 [coding-standards 的 references/entity.md](../nestjs-kit-coding-standards/references/entity.md))作用于编译期 schema 生成;`SwaggerPatcher` 作用于 `createDocument` 之后的文档后处理,两者位于不同阶段

## 相关 skills

- [nestjs-kit-coding-standards](../nestjs-kit-coding-standards/references/query.md) — `@FilterQuery`/`@PageQuery` 参数的 Swagger 声明(与本 skill 配套)
- [nestjs-kit-exception](../nestjs-kit-exception/SKILL.md) — ExceptionResponse 的运行时来源