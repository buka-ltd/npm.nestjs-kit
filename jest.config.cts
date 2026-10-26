import type { JestConfigWithTsJest } from 'ts-jest'
import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from './tsconfig.json'

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testMatch: [
    '<rootDir>/__tests__/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.ts',
  ],
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['./src/**'],
  coverageReporters: ['text', 'cobertura'],
  coveragePathIgnorePatterns: [
    '.*__snapshots__/.*',
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  // 源码使用 `~/` 别名与 `.js` 后缀（nodenext 写法），需前缀 rootDir 并交给 ts-jest-resolver 解析
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  resolver: 'ts-jest-resolver',
  passWithNoTests: true,
}

export default jestConfig
