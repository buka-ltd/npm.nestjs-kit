# Urn — 统一资源名称

## 概述

`Urn` 是 `urn:buka` 统一资源名称的解析与操作工具类，无需注册模块即可使用。

```typescript
import { Urn, DomainUrn, ResourceTypeUrn, ResourceIdUrn } from "@buka/nestjs-kit";
```

## 格式

```
urn:buka:<domain>:<resource-type>[:<resource-id>]
```

三段分别对应**概念域**（资源类型定义权归属）、**资源类型**（可多级，第一级推荐用于 `env`）、**资源ID**（可选）。

```typescript
Urn.of("galaxy");                                    // 概念域级
Urn.of("galaxy", "principal");                       // 资源类型级
Urn.of("galaxy", "principal", "550e8400-e29b-...");  // 实例级
```

> 格式规则详见 [URN 规范](https://github.com/buka-lib/docs.specifications/tree/main/urn)。

## API

### Urn.of

根据参数数量创建对应层级的 URN，返回类型在编译期自动窄化。

```typescript
static of(domain: string): DomainUrn
static of(domain: string, resourceType: string): ResourceTypeUrn
static of(domain: string, resourceType: string, resourceId: string): ResourceIdUrn
```

```typescript
Urn.of("galaxy"); // → DomainUrn
Urn.of("galaxy", "principal"); // → ResourceTypeUrn
Urn.of("galaxy", "principal", "550e8400-e29b-41d4-a716-..."); // → ResourceIdUrn
```

### Urn.parse

从字符串解析为 `Urn` 实例。支持通配符 `*`（匹配单个段）和 `**`（匹配尾部任意段）。

```typescript
static parse(urn: string): Urn
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");
urn.domain;       // → 'galaxy'
urn.resourceType; // → 'principal'
urn.resourceId;   // → 'abc-123'

Urn.parse("urn:buka:galaxy:*:*").contains(urn);  // true
```

### toString

序列化为 URN 字符串。

```typescript
const urn = Urn.of("galaxy", "principal", "abc-123");
urn.toString();  // → 'urn:buka:galaxy:principal:abc-123'
```

### is

判断当前 URN 是否匹配指定条件。仅比较传入的参数，未传入的不参与比较。

```typescript
is(domain: string, resourceType?: string, resourceId?: string): boolean
```

```typescript
const urn = Urn.parse("urn:buka:galaxy:principal:abc-123");

urn.is("galaxy");                           // true
urn.is("galaxy", "principal");              // true
urn.is("galaxy", "principal", "abc-123");   // true
urn.is("galaxy", "oauth2-client");          // false
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

### withResourceType

从概念域级 URN 衍生出资源类型级 URN。

```typescript
withResourceType(resourceType: string): ResourceTypeUrn
```

```typescript
Urn.of("galaxy").withResourceType("principal"); // → ResourceTypeUrn
```

### withResourceId

从资源类型级 URN 衍生出实例级 URN。

```typescript
withResourceId(resourceId: string): ResourceIdUrn
```

```typescript
Urn.of("galaxy", "principal").withResourceId("550e8400-..."); // → ResourceIdUrn
```

### resourceTypeSegments

返回 `resourceType` 按 `:` 拆分后的层级数组。

```typescript
get resourceTypeSegments(): string[]
```

```typescript
Urn.parse("urn:buka:galaxy:principal:v1:table").resourceTypeSegments;
// → ['principal', 'v1', 'table']
```

### 类型守卫

用于 `Urn.parse()` 返回的宽类型 `Urn` 的层级窄化：

```typescript
isDomainUrn(): this is DomainUrn
isResourceTypeUrn(): this is ResourceTypeUrn
isResourceIdUrn(): this is ResourceIdUrn
```

```typescript
const urn = Urn.parse(token.sub);

if (urn.isResourceIdUrn()) {
  urn.resourceId;  // ✅ string，而非 string | undefined
}

if (urn.isResourceTypeUrn()) {
  urn.withResourceId("id");  // ✅ 窄化后合法
}
```

## 使用场景

### JWT subject / audience

```typescript
// 签发
await sessionService.signAccessToken({
  subject: Urn.of("galaxy", "principal", principal.id).toString(),
  claims: { aud: Urn.of("galaxy").toString() },
});

// 消费
const subjectUrn = Urn.parse(payload.sub);
if (subjectUrn.isResourceIdUrn() && subjectUrn.is("galaxy", "principal")) {
  const principalId = subjectUrn.resourceId;
}
```

### 资源类型判断

```typescript
const urn = Urn.parse(session.subject);

if (urn.is("galaxy", "principal")) {
  // 处理 Principal 类型
} else if (urn.is("galaxy", "oauth2-client")) {
  // 处理 OAuth2 Client 类型
}
```

### 衍生复用

```typescript
const principalType = Urn.of("galaxy").withResourceType("principal");

const urn1 = principalType.withResourceId(id1);
const urn2 = principalType.withResourceId(id2);
```
