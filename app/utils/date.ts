import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(timezone)
export const DATE_SEPARATOR = '-'
export const DATE_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD`
export const DATE_TIME_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:mm`

function parseToDayJs(value: string | number | Date | Nullish, timeZone?: string): Dayjs {
  if (typeof value === 'number') {
    return value.toString().length === 10
      ? dayjs.unix(value)
      : dayjs(value)
  }

  if (timeZone) {
    return dayjs.tz(value, timeZone)
  }

  return dayjs(value)
}

export function formatDateTime(value: string | number | Date, format?: string): string
export function formatDateTime(value: string | number | Date | Nullish, format?: string): string | Nullish
export function formatDateTime(value: string | number | Date | Nullish, format: string = DATE_FORMAT, timeZone?: string): string | null {
  const dayJsDate = parseToDayJs(value, timeZone)

  if (!dayJsDate.isValid()) {
    return null
  }

  return dayJsDate.format(format)
}

/**
 * return a Date | null
 * @param value - string | number | null | undefined | date
 * @returns Date | null
 * Examples: For current date = 2023-08-22 16:40, UTC+7, no input zone
 * 1692696654000                => Tue Aug 22 2023 16:30:54 GMT+0700
 * 1692696654                   => Tue Aug 22 2023 16:30:54 GMT+0700
 * new Date()                   => Tue Aug 22 2023 16:40:00 GMT+0700
 * '2023-08-22'                 => Tue Aug 22 2023 07:00:00 GMT+0700
 * '2023-08-22 08:00'           => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023/08/22 08:00'           => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023-08-22T08:00'           => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023-08-22T08:00:00'        => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023-08-22T09:40:00.927Z'   => Tue Aug 22 2023 16:40:00 GMT+0700
 * '2023-08-22T09:40:00+07:00'  => Tue Aug 22 2023 09:40:00 GMT+0700
 */
export function parseDate(value: string | number | Date | Nullish, timeZone?: string): Date | null {
  if (!value) {
    return null
  }

  // ISO time
  if (typeof value === 'string') {
    // replace all '/' by '-'
    value = value.trim().replace(/\//g, '-')

    if (value.length === 10) {
      // yyyy-MM-dd
      value = value.concat('T00:00:00Z')
    }

    if (value.includes(' ')) {
      // yyyy-MM-dd HH:mm
      value = value.replace(' ', 'T')
    }

    const timezoneReg = /[+-]\d{2}:\d{2}$/ // ex: +07:00, -07:00

    // missing 'Z' and not include timezone
    if (value.includes('T') && !value.includes('Z') && !timezoneReg.test(value)) {
      value = value.concat('Z')
    }
  }

  const dayJsDate = parseToDayJs(value, timeZone)

  return dayJsDate.isValid() ? dayJsDate.toDate() : null
}

/**
 * Compare two dates
 * @param date1 - string | number | Date
 * @param date2 - string | number | Date
 * @returns -1 if date1 < date2, 0 if date1 === date2, 1 if date1 > date2
 */
export function compareDates(date1?: string | number | Date, date2?: string | number | Date) {
  // convert the dates to Date objects.
  const d1 = parseDate(date1) as Date
  const d2 = parseDate(date2) as Date

  // Compare the dates using the getTime() method.
  if (!(d1 && d2)) {
    return 0
  }

  if (d1.getTime() < d2.getTime()) {
    return -1
  }

  if (d1.getTime() > d2.getTime()) {
    return 1
  }

  return 0
}

export function minutesToHHMM(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function getWorkingHours(date1: string | number | Date | Nullish, date2: string | number | Date | Nullish) {
  if (!(date1 && date2)) {
    return 'ー'
  }

  const d1 = parseToDayJs(date1)
  const d2 = parseToDayJs(date2)

  const res = d1.diff(d2, 'm')
  if (res < 0) return 'ー'
  return minutesToHHMM(res)
}
