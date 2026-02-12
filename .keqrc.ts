/// <reference types="node" />
import { defineConfig, FileNamingStyle } from '@keq-request/cli'
import { EslintPlugin, OverwriteAdditionalPropertiesPlugin } from '@keq-request/cli/plugins'
import { NestjsTranslator } from '@keq-request/cli/translators'


export default defineConfig({
  outdir: 'src/apis',
  clean: true,
  rendering: {
    fileNamingStyle: FileNamingStyle.kebabCase,
  },
  translators: [new NestjsTranslator()],
  modules: {
    openBaoHttp: {
      url: 'https://openbao.val-istar-guo.com/v1/sys/internal/specs/openapi',
      headers: {
        'X-Vault-Token': String(process.env.BAO_TOKEN),
      },
    },
  },
  plugins: [
    new EslintPlugin(),
    new OverwriteAdditionalPropertiesPlugin({
      disallowIfNotPresent: true,
    }),
  ],
})
