# Urn — 统一资源名称

## 概述

`Urn` 是公司级统一资源名称（Uniform Resource Name）工具类，用于在系统间以标准化格式标识任意资源。无需注册模块，直接从主入口导入即可使用。

```typescript
import {
  Urn,
  NamespaceUrn,
  ResourceUrn,
  IdentifierUrn,
} from "@buka/nestjs-kit";
```

## URN 格式

```
urn:buka:<namespace>[:<resource>[:<identifier>]]
```

| 层级         | 含义                          | 规则                                             |
| ------------ | ----------------------------- | ------------------------------------------------ |
| `buka`       | 组织前缀                      | 固定值                                           |
| `namespace`  | 资源类型所有者（概念域/平台） | 小写 kebab-case，如 `galaxy`、`infra`            |
| `resource`   | 资源类型                      | 小写 kebab-case，如 `principal`、`oauth2-client` |
| `identifier` | 资源唯一标识                  | UUID、hex 或其他自定义格式                       |

### 三种粒度

URN 支持三种粒度，`resource` 和 `identifier` 均为可选：

| 粒度         | 类型            | 格式                            | 示例                                     | 用途                               |
| ------------ | --------------- | ------------------------------- | ---------------------------------------- | ---------------------------------- |
| namespace 级 | `NamespaceUrn`  | `urn:buka:<ns>`                 | `urn:buka:galaxy`                        | 标识平台/系统整体，如 JWT audience |
| 资源类型级   | `ResourceUrn`   | `urn:buka:<ns>:<resource>`      | `urn:buka:galaxy:principal`              | 标识一类资源                       |
| 实例级       | `IdentifierUrn` | `urn:buka:<ns>:<resource>:<id>` | `urn:buka:galaxy:principal:550e8400-...` | 标识具体资源实例，如 JWT subject   |

### namespace 划分原则

namespace 按**资源类型的定义权归属**划分，而非按部署单元。一个 namespace 可以有多个服务实现。

例如，`principal` 和 `oauth2-client` 都由 Galaxy 平台定义，因此都属于 `galaxy` namespace，即使它们可能由不同的微服务管理。

## API

### Urn.of

根据参数数量创建对应层级的 URN，返回类型在编译期自动窄化。构造函数为 `private`，`Urn.of` 是创建 URN 的主要入口。

```typescript
static of(namespace: string): NamespaceUrn
static of(namespace: string, resource: string): ResourceUrn
static of(namespace: string, resource: string, identifier: string): IdentifierUrn
```

```typescript
Urn.of("galaxy"); // → NamespaceUrn
Urn.of("galaxy", "principal"); // → ResourceUrn
Urn.of("galaxy", "principal", "550e8400-e29b-41d4-a716-..."); // → IdentifierUrn
```

### Urn.parse

从 URN 字符串解析为 `Urn` 实例。格式不合法时抛出 `Error`。返回宽类型 `Urn`，可通过类型守卫进一步窄化。

```typescript
static parse(urn: string): Urn
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");
urn.namespace; // → 'galaxy'
urn.resource; // → 'principal'
urn.identifier; // → 'abc-123'

const nsUrn = Urn.parse("urn:buka:galaxy");
nsUrn.namespace; // → 'galaxy'
nsUrn.resource; // → undefined
nsUrn.identifier; // → undefined
```

> 格式不合法时抛出 `Error: Invalid URN: <input>`。

### toString

序列化为 URN 字符串。

```typescript
toString(): string
```

```typescript
Urn.of("galaxy", "principal", "abc-123").toString();
// → 'urn:buka:galaxy:principal:abc-123'
```

### is

判断当前 URN 是否匹配指定条件。仅比较传入的参数，未传入的参数不参与比较。

```typescript
is(namespace: string, resource?: string, identifier?: string): boolean
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");

urn.is("galaxy"); // → true（仅匹配 namespace）
urn.is("galaxy", "principal"); // → true
urn.is("galaxy", "principal", "abc-123"); // → true
urn.is("galaxy", "oauth2-client"); // → false
urn.is("infra"); // → false
```

### withResource

从 `NamespaceUrn` 衍生出 `ResourceUrn`。当前 URN 已有 `resource` 时抛出 `Error`。

```typescript
withResource(resource: string): ResourceUrn  // 仅 NamespaceUrn 可调用
```

```typescript
const ns = Urn.of("galaxy"); // NamespaceUrn
const resource = ns.withResource("principal"); // ResourceUrn

resource.withResource("other"); // ❌ 编译错误：ResourceUrn 上此方法为 never
```

### withIdentifier

从 `ResourceUrn` 衍生出 `IdentifierUrn`。当前 URN 无 `resource` 或已有 `identifier` 时抛出 `Error`。

```typescript
withIdentifier(identifier: string): IdentifierUrn  // 仅 ResourceUrn 可调用
```

```typescript
const resource = Urn.of("galaxy", "principal");
const instance = resource.withIdentifier("550e8400-..."); // IdentifierUrn

Urn.of("galaxy").withIdentifier("id"); // ❌ 编译错误：NamespaceUrn 上此方法为 never
```

### 类型守卫

用于 `Urn.parse()` 返回的宽类型 `Urn` 的层级窄化：

```typescript
isNamespaceUrn(): this is NamespaceUrn
isResourceUrn(): this is ResourceUrn
isIdentifierUrn(): this is IdentifierUrn
```

```typescript
const urn = Urn.parse(token.sub);

if (urn.isResourceUrn()) {
  urn.withIdentifier("some-id"); // ✅ 窄化后合法
}

if (urn.isIdentifierUrn()) {
  const id = urn.identifier; // ✅ 类型为 string（非 string | undefined）
}
```

## 使用场景

### JWT subject / audience

将 URN 用于 JWT 的 `sub` 和 `aud` 字段，使 token 自带主体类型信息：

```typescript
// 签发 token
const accessToken = await sessionService.signAccessToken({
  subject: Urn.of("galaxy", "principal", principal.id).toString(),
  claims: {
    aud: Urn.of("galaxy").toString(),
  },
});

// 消费 token —— 从 sub 中提取 principal ID
const subjectUrn = Urn.parse(payload.sub);
if (subjectUrn.isIdentifierUrn() && subjectUrn.is("galaxy", "principal")) {
  const principalId = subjectUrn.identifier; // string，无需可选链
}
```

### 资源类型判断

在不引入额外字段的情况下，通过 URN 判断资源类型并执行分支逻辑：

```typescript
const urn = Urn.parse(session.subject);

if (urn.is("galaxy", "principal")) {
  // 处理 Principal 类型的 subject
} else if (urn.is("galaxy", "oauth2-client")) {
  // 处理 OAuth2 Client 类型的 subject
}
```

### 派生方法逐层构建

当需要在运行时动态组装 URN 时，可通过派生方法链式构建：

```typescript
const principalType = Urn.of("galaxy").withResource("principal"); // ResourceUrn，可复用

// 为不同 ID 生成实例级 URN
const urn1 = principalType.withIdentifier(id1);
const urn2 = principalType.withIdentifier(id2);
```
