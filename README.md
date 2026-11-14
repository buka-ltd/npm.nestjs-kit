# @buka/nestjs-kit

实现符合 Buka API 规范的 NestJS 开发套件。

详细文档请参阅 [docs/index.md](./docs/index.md)

## 安装

```bash
pnpm install @buka/nestjs-kit
```

## Skills

本仓库的 [skills/](./skills) 目录沉淀了 kit 各功能域的使用约定与编写规范（共 9 个 skill，其中 dto/entity/service/controller/query 等文件编写规范聚合为 nestjs-kit-coding-standards，细节经其 references/ 目录按需加载），
供业务项目的 AI 编码助手（Claude Code 等）使用，按需自动触发（每个 skill 的 description 声明了其适用任务）。通过 [`skills`](https://www.npmjs.com/package/skills) CLI 安装：

```bash
# 查看本仓库可用的 skills
npx skills add buka-ltd/npm.nestjs-kit --list

# 在业务项目中安装到 Claude Code（交互式选择）
npx skills add buka-ltd/npm.nestjs-kit -a claude-code

# 按需安装指定 skills
npx skills add buka-ltd/npm.nestjs-kit -a claude-code \
  --skill nestjs-kit-coding-standards

# 全量安装（CI/脚本等非交互场景）
npx skills add buka-ltd/npm.nestjs-kit --skill '*' -a claude-code -y

# 更新已安装的 skills
npx skills update
```

> 默认安装到项目的 `.claude/skills/`（用 `-g` 装到全局 `~/.claude/skills/`；用 `--copy` 以复制代替符号链接）。
> 本仓库的 skills 也可用本地路径安装（开发调试时）：`npx skills add ./skills -a claude-code`。

| Skill                         | 覆盖内容                                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nestjs-kit-coding-standards` | 模块目录组织（features 功能分组、src/shared 跨模块共享层）与 dto/entity/service/controller/query 的编写规范（@Model/Column/Cardinality/command/@FilterQuery/Slice/@IsBrowserRequest 等，references/ 按需加载） |
| `nestjs-kit-urn`              | URN 格式规范、概念域与资源段、通配匹配                                                                                                                           |
| `nestjs-kit-exception`        | 异常工厂、@ModuleExceptions、错误码体系                                                                                                                          |
| `nestjs-kit-logger`           | LoggerModule、@InjectLogger、LoggerConfig                                                                                                                        |
| `nestjs-kit-http`             | keq 服务间调用的错误处理                                                                                                                                         |
| `nestjs-kit-crypto`           | 信封加密 / 盲索引 / 加盐哈希                                                                                                                                     |
| `nestjs-kit-object-storage`   | S3 兼容对象存储                                                                                                                                                  |
| `nestjs-kit-open-bao`         | OpenBao/Vault 集成                                                                                                                                               |
| `nestjs-kit-swagger`          | Swagger 文档修补                                                                                                                                                 |
