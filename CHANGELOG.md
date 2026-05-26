# Changelog

## [4.3.2](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.3.1...v4.3.2) (2026-05-26)


### Performance Improvements

* 对象存储模块添加错误日志 ([968aaab](https://github.com/buka-ltd/npm.nestjs-kit/commit/968aaab5542e3a1f952027f61ad17cafca8fd4ba))

## [4.3.1](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.3.0...v4.3.1) (2026-05-25)


### Bug Fixes

* 因 Transient 装饰器未注册 Proptery 导致无法执行正确的转换 ([6a23663](https://github.com/buka-ltd/npm.nestjs-kit/commit/6a2366359bf62164e67909b2387672f8b7282cd9))

## [4.3.0](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.2.0...v4.3.0) (2026-05-24)


### Features

* add MatchUrn validator ([89196bd](https://github.com/buka-ltd/npm.nestjs-kit/commit/89196bd1d263feccf7cc9d0f8b8adad90d1d219f))

## [4.2.0](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.9...v4.2.0) (2026-05-24)


### Features

* urn支持通配符 ([31bc4e1](https://github.com/buka-ltd/npm.nestjs-kit/commit/31bc4e13045255eb99b8b719589af697046005d0))

## [4.1.9](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.8...v4.1.9) (2026-05-24)


### Bug Fixes

* authLogging should export ([0f0bf53](https://github.com/buka-ltd/npm.nestjs-kit/commit/0f0bf53ff992b9fdf13e8f4e3641f5869e929623))

## [4.1.8](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.7...v4.1.8) (2026-05-23)


### Bug Fixes

* 修复dek缓存返回原始数据被删除后缓存损坏的问题 ([5761659](https://github.com/buka-ltd/npm.nestjs-kit/commit/57616596144eaacb9e9488ed26d441f45ef1d9ac))

## [4.1.7](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.6...v4.1.7) (2026-05-23)


### Bug Fixes

* 修复预热dek和openbao初始化鉴权冲突的问题 ([4e75b91](https://github.com/buka-ltd/npm.nestjs-kit/commit/4e75b914cfa8d2a503b277215fb88ef0eaef136f))

## [4.1.6](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.5...v4.1.6) (2026-05-23)


### Performance Improvements

* 控制数据库连接数 ([55ea1ed](https://github.com/buka-ltd/npm.nestjs-kit/commit/55ea1ed660e5c948d6591d6c7605b525e399b5a5))

## [4.1.5](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.4...v4.1.5) (2026-05-23)


### Bug Fixes

* deep import error ([0b0645f](https://github.com/buka-ltd/npm.nestjs-kit/commit/0b0645f6018d6ed810aaa305380d6105379b5e59))

## [4.1.4](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.3...v4.1.4) (2026-05-21)


### Bug Fixes

* 修复setTimeout溢出问题 ([ac82108](https://github.com/buka-ltd/npm.nestjs-kit/commit/ac82108f1d958cc436584bc86bd1db01f215830c))

## [4.1.3](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.2...v4.1.3) (2026-05-21)


### Bug Fixes

* 修复格式化错误无效的问题 ([6fca5cb](https://github.com/buka-ltd/npm.nestjs-kit/commit/6fca5cbb5526055f34dc35028e9eb82c8c709866))

## [4.1.2](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.1...v4.1.2) (2026-05-21)


### Performance Improvements

* 优化 openbao module 报错信息提示准确性 ([2245b17](https://github.com/buka-ltd/npm.nestjs-kit/commit/2245b1765b7d65ee4827727eb2f5fddb67b523a2))

## [4.1.1](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.1.0...v4.1.1) (2026-05-10)


### Bug Fixes

* rename buka-inc to buka-ltd ([43e72ca](https://github.com/buka-ltd/npm.nestjs-kit/commit/43e72ca4065676cc384f07daf1953f2e04565244))

## [4.1.0](https://github.com/buka-ltd/npm.nestjs-kit/compare/v4.0.0...v4.1.0) (2026-05-10)

### Features

- add logger module ([5ead6da](https://github.com/buka-ltd/npm.nestjs-kit/commit/5ead6da6c15ae46929e713063b2dd0d580d63996))

## [4.0.0](https://github.com/buka-ltd/npm.nestjs-kit/compare/v3.0.1...v4.0.0) (2026-05-06)

### ⚠ BREAKING CHANGES

- overhaul entire project architecture

### Code Refactoring

- overhaul entire project architecture ([b4047a7](https://github.com/buka-ltd/npm.nestjs-kit/commit/b4047a790498a9f4b967d33830d6786ba3b24642))
