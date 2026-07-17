import { localize, setLocale } from '@vee-validate/i18n'
import ja from '@vee-validate/i18n/dist/locale/ja.json'
import { one_of, required, url } from '@vee-validate/rules'
import { configure, defineRule } from 'vee-validate'

// 使用可能なルール一覧:
// https://vee-validate.logaretm.com/v4/guide/global-validators/#vee-validaterules
export default defineNuxtPlugin(() => {
  // Object.keys(all).forEach((rule) => {
  //   defineRule(rule, all[rule] as any)
  // })
  defineRule('required', required)
  defineRule('one_of', one_of)

  defineRule('required_if', (value, [target, targetValue]: [string, any], ctx) => {
    if (targetValue === ctx.form[target]) {
      return required(value)
    }
    return true
  })

  defineRule('optional_url', (value: string) => {
    if (!value || !value.length) {
      return true
    }
    return url(value, { pattern: /^https?:\/\/.*$/ })
  })

  configure({
    validateOnBlur: false,
    validateOnChange: false,
    validateOnInput: false,
    generateMessage: localize({
      ja,
    }),
  })

  setLocale('ja')
})
