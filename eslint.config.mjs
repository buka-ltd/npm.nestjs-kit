import buka from '@buka/eslint-config';
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ['dist'],
  },
  {
    files: ["**/*.ts"],
    extends: [buka.nestjs.recommended],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.ts", "*.config.cts", ".*.ts"],
          defaultProject: "tsconfig.config.json",
        },
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
])
