# Internals

本目录存放从外部库中内联的代码，以避免 deep import（如 `@nestjs/swagger/dist/services/...`）触发 `ERR_PACKAGE_PATH_NOT_EXPORTED` 错误。

每个文件对应一个外部库，仅内联该库中实际用到的部分。
