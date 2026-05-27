# Urn — 统一资源名称

## 概述

`Urn` 是 `urn:buka` 统一资源名称的解析与操作工具类，无需注册模块即可使用。

```typescript
import { Urn } from "@buka/nestjs-kit";
```

## 格式

```
urn:buka:<domain>:<resource...>
```

- **domain**：概念域，按资源类型定义权归属划分，通常为系统名
- **resource**：domain 之后的完整资源路径（`:` 分隔，零到多段）。parser 不区分"类型"和"实例"，应用层自行约定各段语义

```typescript
Urn.of("galaxy");                                        // 概念域级
Urn.of("galaxy", "auth-client:galaxy:console");           // 资源级（字符串）
Urn.of("galaxy", ["auth-client", "galaxy", "console"]);   // 资源级（数组）
```

> 格式规则详见 [URN 规范](https://github.com/buka-lib/docs.specifications/tree/main/urn)。

## API

### Urn.of

根据参数创建 URN。第二参数可为 `: ` 分隔的字符串或 `string[]`。

```typescript
static of(domain: string, resource?: string | string[]): Urn
```

```typescript
Urn.of("galaxy");                                              // 概念域级
Urn.of("galaxy", "principal:abc-123");                         // 资源级
Urn.of("galaxy", ["principal", "abc-123"]);                    // 资源级（数组）
Urn.of("galaxy", ["auth-client", "galaxy", "console"]);        // 多段资源路径
```

### Urn.parse

从字符串解析为 `Urn` 实例。支持通配符 `*`（匹配单个段）和 `**`（匹配尾部任意段）。

```typescript
static parse(urn: string): Urn
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");
urn.domain;            // → 'galaxy'
urn.resource;          // → 'principal:abc-123'
urn.resourceSegments;  // → ['principal', 'abc-123']

Urn.parse("urn:buka:galaxy:*:*").contains(urn);  // true
```

### toString

序列化为 URN 字符串。

```typescript
const urn = Urn.of("galaxy", ["principal", "abc-123"]);
urn.toString();  // → 'urn:buka:galaxy:principal:abc-123'
```

### is

判断当前 URN 是否匹配指定的 domain 和 resource。仅比较传入的参数，未传入的不参与比较。

```typescript
is(domain: string, resource?: string): boolean
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");

urn.is("galaxy");                                // true
urn.is("galaxy", "principal:abc-123");           // true（精确匹配 resource）
urn.is("galaxy", "principal");                   // false（resource 不精确匹配）
```

### match

判断当前 URN 是否匹配指定的 URN 模式（支持通配符）。

```typescript
match(pattern: string): boolean
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");

urn.match("urn:buka:galaxy:principal:*");          // true
urn.match("urn:buka:galaxy:principal:**");         // true
urn.match("urn:buka:galaxy:*:*");                  // true
urn.match("urn:buka:galaxy:oauth2-client:*");      // false
```

### contains

判断当前 URN **是否包含**另一个 URN。含通配符时作为集合模式使用。

```typescript
contains(other: Urn): boolean
```

```typescript
const pattern = Urn.parse("urn:buka:galaxy:*:*");
pattern.contains(Urn.parse("urn:buka:galaxy:principal:123"));  // true
pattern.contains(Urn.parse("urn:buka:galaxy:org:456"));        // true
pattern.contains(Urn.parse("urn:buka:infra:org:456"));         // false

const tail = Urn.parse("urn:buka:galaxy:principal:**");
tail.contains(Urn.parse("urn:buka:galaxy:principal"));          // true
tail.contains(Urn.parse("urn:buka:galaxy:principal:123"));      // true

// 具体 URN 仅包含自身
const concrete = Urn.parse("urn:buka:galaxy:principal:123");
concrete.contains(Urn.parse("urn:buka:galaxy:principal:123"));  // true
concrete.contains(Urn.parse("urn:buka:galaxy:principal:456"));  // false
```

### withResource

从概念域级 URN 衍生出资源级 URN。

```typescript
withResource(...segments: string[]): Urn
```

```typescript
Urn.of("galaxy").withResource("principal", "abc-123");
// → urn:buka:galaxy:principal:abc-123

Urn.of("galaxy").withResource("auth-client", "galaxy", "console");
// → urn:buka:galaxy:auth-client:galaxy:console
```

### resourceSegments

返回 `resource` 按 `:` 拆分后的段数组。

```typescript
get resourceSegments(): string[]
```

```typescript
Urn.parse("urn:buka:galaxy:auth-client:galaxy:console").resourceSegments;
// → ['auth-client', 'galaxy', 'console']
```

### isDomainUrn

类型守卫：判断是否为概念域级 URN（无 resource）。

```typescript
isDomainUrn(): boolean
```

```typescript
const urn = Urn.parse("urn:buka:galaxy");

if (urn.isDomainUrn()) {
  // urn.resource 为 undefined
}
```

## 使用场景

### JWT subject / audience

```typescript
// 签发
await sessionService.signAccessToken({
  subject: Urn.of("galaxy", ["principal", principal.id]).toString(),
  claims: { aud: Urn.of("galaxy").toString() },
});

// 消费
const subjectUrn = Urn.parse(payload.sub);
if (subjectUrn.match("urn:buka:galaxy:principal:*")) {
  const principalId = subjectUrn.resourceSegments[1];
}
```

### 资源路径判断

```typescript
const urn = Urn.parse(session.subject);

if (urn.match("urn:buka:galaxy:principal:*")) {
  // 处理 Principal 类型
} else if (urn.match("urn:buka:galaxy:oauth2-client:*")) {
  // 处理 OAuth2 Client 类型
}
```

### 衍生复用

```typescript
const domainUrn = Urn.of("galaxy");

const urn1 = domainUrn.withResource("principal", id1);
const urn2 = domainUrn.withResource("principal", id2);
```
