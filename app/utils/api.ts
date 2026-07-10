import type { FetchError } from 'ofetch'

// Type guard for ofetch's FetchError — narrows unknown to FetchError
export function isFetchError(err: unknown): err is FetchError {
  return typeof err === 'object' && err !== null && 'data' in err && typeof (err as any).status === 'number'
}
