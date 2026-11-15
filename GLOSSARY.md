# @buka/nestjs-kit

Buka API 规范的 NestJS 开发套件:库代码,以及随包分发、供 AI 编码助手使用的 skill。

## Language

**编码规约**:
NestJS 业务代码必须符合的强制规范,由 `nestjs-kit-coding-standards` 承载;规约范围内未写明的东西不属其管辖。
_Avoid_: 编写规范、最佳实践、coding standards

**功能 skill**:
介绍 kit 某个能力的用法、配置与边界的 skill,不带强制约束。
_Avoid_: 用法文档、API skill

**业务代码**:
使用本 kit 的业务项目中由人工维护的 NestJS 源码;不含 kit 自身源码与构建产物。
_Avoid_: 用户代码、应用代码

**触发语**:
skill 描述里声明"何时加载"的那段话,决定模型是否会主动加载该 skill。
_Avoid_: 适用场景、使用条件
