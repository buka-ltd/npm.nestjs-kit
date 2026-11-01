# SwaggerPatcher

## `SwaggerPatcher.deepObjectifyQueries(openapi)`

如果 Query 是 `object`/`array` 类型且未明确设置 `style`，则添加 `"style": "deepObject"`。

```typescript
import { SwaggerPatcher } from "@buka/nestjs-kit";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const builder = new DocumentBuilder();
const document = SwaggerModule.createDocument(app, builder);

SwaggerPatcher.deepObjectifyQueries(document);

SwaggerModule.setup("/swagger/ui", app, document);
```

## `SwaggerPatcher.unifyExceptionResponses(openapi, options?)`

将统一异常响应结构（`ExceptionResponse`）注入 OpenAPI 文档：

- 在 `components.schemas` 注册 `ExceptionResponse` schema
- 在 `components.responses` 注册可复用的 `ExceptionResponse` 响应对象

通过 `options` 控制如何修改各 operation 的 responses：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `overwrite` | `('4xx' \| '5xx' \| 'default' \| number)[]` | `[]` | 覆写已有的哪些响应 |
| `insert` | `(number \| 'default')[]` | `[]` | 插入状态码响应（已存在也覆盖） |
| `filter` | `(context: { pathname, method, operation }) => boolean` | `undefined` | 返回 `false` 的 operation 完全跳过（既不覆写也不插入） |

```typescript
import { SwaggerPatcher } from "@buka/nestjs-kit";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const builder = new DocumentBuilder();
const document = SwaggerModule.createDocument(app, builder);

// 仅注册组件，不修改 operations
SwaggerPatcher.unifyExceptionResponses(document);

// 为所有 operation 插入 401, 403, 500
SwaggerPatcher.unifyExceptionResponses(document, {
  insert: [401, 403, 500],
});

// 覆写已有的 4xx/5xx 响应
SwaggerPatcher.unifyExceptionResponses(document, {
  overwrite: ["4xx", "5xx"],
});

// 覆写 5xx + 插入 401, 403
SwaggerPatcher.unifyExceptionResponses(document, {
  overwrite: ["5xx"],
  insert: [401, 403],
});

SwaggerModule.setup("/swagger/ui", app, document);
```

### 跳过统一异常响应

错误体遵循其他规范的端点（如 OAuth2 token、健康检查）不应被统一为 Buka 信封。在 controller 方法上添加 `@SkipUnifiedExceptionResponse()`，该 operation 就会完全跳过：

```typescript
import { SkipUnifiedExceptionResponse } from "@buka/nestjs-kit";
import { ApiResponse } from "@nestjs/swagger";

@Post("token")
@SkipUnifiedExceptionResponse()
@ApiResponse({ status: 400, type: OAuth2ErrorResponseDto })
@ApiResponse({ status: 401, type: OAuth2ErrorResponseDto })
exchangeToken() {}
```

- 装饰器写入 `x-buka-skip-unified-exception-response: true` 扩展；标记在 controller 类上时对该类所有 operation 生效。
- 被跳过的 operation 不会被 `overwrite` 或 `insert` 修改，需自行用 `@ApiResponse` 声明错误响应。
- `components.schemas.ExceptionResponse` 与 `components.responses.ExceptionResponse` 仍会注册（全局组件，与具体 operation 无关）。
- 无法修改 controller 的 operation（第三方模块等）用 `filter` 豁免：

```typescript
SwaggerPatcher.unifyExceptionResponses(document, {
  overwrite: ["4xx", "5xx"],
  filter: ({ pathname }) => pathname !== "/health",
});
```
