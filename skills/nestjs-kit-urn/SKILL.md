---
name: nestjs-kit-urn
description: >
  本 skill 定义 urn:buka 统一资源标识符(URN)规范。当用户构造或解析 urn:buka:... 标识、
  确定资源归属的概念域(domain)与资源段(resource)命名、设计 env 段约定、
  书写通配匹配模式(* 与 **)、或使用 @IsUrn/@IsDomainUrn/@MatchesUrn 校验器而需了解其语义背景时使用本 skill。
---

# URN 规范 (urn:buka)

`urn:buka` 是 Buka 所有数字资产的统一资源标识符(Uniform Resource Name),纯命名规范,无包依赖。

## 格式

```
urn:buka:<domain>[:<resource>]
```

| 段         | 含义                                  | 约束                                 |
| ---------- | ------------------------------------- | ------------------------------------ |
| `domain`   | 概念域 — 资源定义权归属,通常为系统名 | `[a-z][a-z0-9-]*`                    |
| `resource` | 资源路径,多段,可选                  | `[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*` |

### 概念域

概念域按**资源类型的定义权归属**划分,非按部署单元。一个概念域可以有多个服务实现。

| 类型 | 定义权归属 | 名称 | 示例 |
| --- | --- | --- | --- |
| 系统域 | 某个系统 | 系统名 | `galaxy`、`openbao`、`kafka` |
| 虚拟域 | 公司级跨系统约定,不属于任何单一系统实现 | 规范登记的保留名 | `application`、`service` |

#### 系统域

绝大多数资源归属某个系统,使用系统名作为概念域;系统域的名称与该系统一致。系统域级 URN 表示该系统本身(如 `urn:buka:galaxy`)。

#### 虚拟域

**虚拟域(virtual domain)**:资源类型的定义权不属于任何单一系统、而属于公司级跨系统约定的概念域。虚拟域不是系统名,也不对应任何部署单元;它通过资源级 URN 被跨系统引用。

设立虚拟域须同时满足:

1. 该资源类型被多个系统共同引用(如应用授权单位、服务身份与发现);
2. 定义权若归属某个系统,会因该系统改名、拆分或替换而使标识失效;
3. 存在唯一的公司级注册表定义其格式与实例,并已在本规范登记。

约束:

- 虚拟域名称不得与系统名相同,也不得再作为系统名注册;
- 实现侧不得自行约定虚拟域;新增虚拟域必须先登记在本规范;
- 虚拟域的域级 URN(`urn:buka:application`、`urn:buka:service`)只是命名空间,不指向任何对象,不能作为标识符使用。

##### 虚拟域登记

| 虚拟域 | 格式 | 定义方 | 语义 |
| --- | --- | --- | --- |
| `application` | `urn:buka:application:{handle}` | 应用注册表 | 应用身份:授权单位与 token audience;`handle` 全局唯一、创建后不可变 |
| `service` | `urn:buka:service:{system}:{name}` | 服务注册表 | 服务身份与发现句柄;`system` 为 L1 系统,`name` 为 L2 服务;服务不是授权单位,不作为 token audience |

### 字符集

- **允许**:小写字母 `a-z`、数字 `0-9`、连字符 `-`
- **保留**:`:` 段分隔符、`*` 通配(单段)、`**` 通配(尾部任意段)
- 其余字符一律禁止

### env 约定

`resource` 的第一段**推荐**用于 `env`(环境),表示资源的部署作用域。这是一个语义约定,不强制:

- 多环境部署的平台(如 OpenBao):用 `prod` / `dev` 作为 resource 第一段
- 单实例平台(如 Galaxy):resource 不包含 env 层级,第一段直接为资源类型

## 粒度

URN 支持两种粒度:

| 粒度     | 格式                           | 示例                                 |
| -------- | ------------------------------ | ------------------------------------ |
| 概念域级 | `urn:buka:<domain>`            | `urn:buka:galaxy`                    |
| 资源级   | `urn:buka:<domain>:<resource>` | `urn:buka:galaxy:principal:550e8400` |

## 示例

| 概念域       | resource                     | URN                                              | 说明                    |
| ------------ | ---------------------------- | ------------------------------------------------ | ----------------------- |
| `galaxy`     | `principal:550e8400`         | `urn:buka:galaxy:principal:550e8400`             | Galaxy 用户主体         |
| `galaxy`     | `image:backend`              | `urn:buka:galaxy:image:backend`                  | Galaxy 后端容器镜像     |
| `galaxy`     | `npm:nestjs-sdk`             | `urn:buka:galaxy:npm:nestjs-sdk`                 | Galaxy npm 包           |
| `galaxy`     | `auth-client:galaxy:console` | `urn:buka:galaxy:auth-client:galaxy:console`     | Galaxy 认证客户端       |
| `openbao`    | `prod:kv:galaxy:database`    | `urn:buka:openbao:prod:kv:galaxy:database`       | OpenBao 生产环境 KV     |
| `openbao`    | `dev:kv:galaxy:database`     | `urn:buka:openbao:dev:kv:galaxy:database`        | OpenBao 开发环境 KV     |
| `kafka`      | `prod:topic:galaxy-events`   | `urn:buka:kafka:prod:topic:galaxy-events`        | Kafka 生产环境 Topic    |
| `kubernetes` | `prod:deployment:galaxy:api` | `urn:buka:kubernetes:prod:deployment:galaxy:api` | K8s 生产环境 Deployment |
| `galaxy` | — | `urn:buka:galaxy` | Galaxy 系统(系统域级) |
| `application` | `galaxy` | `urn:buka:application:galaxy` | Galaxy 应用(虚拟域,授权单位 / aud) |
| `service` | `galaxy:backend` | `urn:buka:service:galaxy:backend` | Galaxy 后端服务(虚拟域,发现句柄) |

## 通配匹配

`*` 匹配单个 `:` 段,`**` 匹配尾部任意段(仅允许出现在末尾)。

| 模式                             | 匹配                                        |
| -------------------------------- | ------------------------------------------- |
| `urn:buka:galaxy:*:*`            | galaxy 概念域下所有两段 resource            |
| `urn:buka:galaxy:principal:*`    | galaxy 的 principal 类型的所有资源          |
| `urn:buka:openbao:*:kv:galaxy:*` | openbao 任意环境的 galaxy KV 路径下的所有键 |
| `urn:buka:galaxy:**`             | galaxy 概念域下的任意 URN                   |

## 相关 skills

- [nestjs-kit-coding-standards](../nestjs-kit-coding-standards/references/dto.md) — `@IsUrn`/`@IsDomainUrn`/`@MatchesUrn` 入参校验