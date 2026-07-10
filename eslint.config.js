import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import antfu from '@antfu/eslint-config'
import pluginTailwindcss from 'eslint-plugin-tailwindcss'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default antfu(
  ...pluginTailwindcss.configs['flat/recommended'],
  {
    ignores: ['public/**'],
  },
  {
    rules: {
      'tailwindcss/no-custom-classname': 'off',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'antfu/if-newline': 'off',
      'antfu/curly': 'off',
      'node/prefer-global/process': 'off',
      'style/brace-style': ['error', '1tbs'],
      'eslint-comments/no-unlimited-disable': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unused-imports/no-unused-vars': 'warn',
      'no-alert': 'warn',
      'vue/custom-event-name-casing': 'off',
      'new-cap': 'off',
    },
    settings: {
      tailwindcss: {
        config: `${__dirname}/app/assets/styles/tailwind.css`,
      },
    },
  },
)
