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
| `insert` | `(number \| 'default')[]` | `[]` | 插入新的状态码响应 |

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
