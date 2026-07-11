import type { Placement } from '@floating-ui/vue'

export function sleep(duration = 0) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

export function mod(index: number, total: number): number {
  return ((index % total) + total) % total
}

/**
 * Converts a Floating UI placement value to a CSS transform-origin value
 *
 * @param placement - The Floating UI placement value
 * @returns The corresponding CSS transform-origin value
 */
export function getTransformOrigin(placement: Placement): string {
  const transformOrigins: Record<Placement, string> = {
    // Top placements
    'top': 'bottom',
    'top-start': 'bottom left',
    'top-end': 'bottom right',

    // Right placements
    'right': 'left',
    'right-start': 'left top',
    'right-end': 'left bottom',

    // Bottom placements
    'bottom': 'top',
    'bottom-start': 'top left',
    'bottom-end': 'top right',

    // Left placements
    'left': 'right',
    'left-start': 'right top',
    'left-end': 'right bottom',
  }

  return transformOrigins[placement] || 'center'
}

export function getErrorMessage(error: unknown, defaultMessage = 'Unknown Error'): string {
  if (typeof error === 'string') return error

  if (isFetchError(error)) {
    return error.data?.message ?? defaultMessage
  }

  if (
    error
    && typeof error === 'object'
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message
  }

  return defaultMessage
}

export function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return `hsl(${h} 62% 52%)`
}

export function getPtValue(pt: Record<string, any> | undefined, key: string) {
  if (!pt) return
  const value = pt[key]

  if (typeof value === 'string' || Array.isArray(value)) {
    return { class: value }
  }

  return value
}
