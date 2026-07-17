import type { RepeatForm } from '~/types/schedule'

export const repeatUnitOptions = [
  { label: '毎日', value: '01' },
  { label: '平日', value: '02' },
  { label: '毎週 月水金', value: '03' },
  { label: '毎週 火木', value: '04' },
  { label: '毎週', value: '05' },
  { label: '毎月', value: '06' },
  { label: '毎年', value: '07' },
]

export const repeatIntervalOptions = Array.from({ length: 50 }, (_, i) => ({ label: i + 1, value: i + 1 }))

export const repeatDayOptions = [
  { label: '月', value: 2 },
  { label: '火', value: 4 },
  { label: '水', value: 8 },
  { label: '木', value: 16 },
  { label: '金', value: 32 },
  { label: '土', value: 64 },
  { label: '日', value: 1 },
]

export const repeatStandardMonthlyOptions = [
  { label: '日付', value: '01' },
  { label: '曜日', value: '02' },
]

const WEEKDAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

export function repeatIntervalSuffix(unit: string): string {
  switch (unit) {
    case '01':
      return '日'
    case '05':
      return '週'
    case '06':
      return '月'
    case '07':
      return '年'
    default:
      return ''
  }
}

export function toNthWeekdayLabel(date: Date): string {
  const dayOfWeek = date.getDay() // 0 (Sun) - 6 (Sat)
  const dayOfMonth = date.getDate()
  const nth = Math.ceil(dayOfMonth / 7)

  return `第${nth}${WEEKDAY_LABELS_JA[dayOfWeek]}曜日`
}

export function buildRepeatDescription(form: RepeatForm, startDate: string): string {
  // 繰り返す単位
  const repeatUnitText = repeatUnitOptions.find(i => i.value === form.unit)?.label ?? ''

  // 繰り返す曜日
  let repeatWeeklyText = ''
  if (form.unit === '05') {
    repeatWeeklyText = repeatDayOptions
      .filter(opt => form.weekdays.includes(opt.value))
      .map(opt => opt.label)
      .join(' ')
  }

  // 繰り返す基準
  let repeatStandardText = ''
  if (form.unit === '06') {
    // 日付
    if (form.standard === '01') {
      repeatStandardText = `${startDate.split('-')[2]}日`
    }
    // 曜日
    if (form.standard === '02') {
      repeatStandardText = toNthWeekdayLabel(new Date(startDate))
    }
  }

  // 終了日
  let endText = ''
  if (form.endCond === '1') {
    endText = `${form.number}回`
  } else if (form.endCond === '2') {
    endText = `${form.endDate}まで`
  }

  return `${repeatUnitText} ${repeatWeeklyText} ${repeatStandardText} ${endText}`
}
