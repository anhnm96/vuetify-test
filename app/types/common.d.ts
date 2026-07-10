type Severity = 'info' | 'success' | 'warn' | 'error'
type ValueOf<T> = T[keyof T]
type Position = 'top' | 'bottom' | 'left' | 'right'
type Primitive = string | number | bigint | boolean | symbol
type Key = string | number | symbol
type Nullish = null | undefined
type Falsy = false | '' | 0 | null | undefined
type LooseAutocomplete<T extends string> = T | Omit<string, T>

interface ApiResponse<T> {
  data: T
}

interface PaginatedResponse<T> {
  status: number
  statusText: string
  data: {
    list: T[]
    total: number
    skip: number
    limit: number
    [key: string]: unknown
  }
}

type MaybeNull<T> = T | null
type MaybeUndefined<T> = T | undefined
type MaybeNullish<T> = T | null | undefined

interface UserOption {
  userId: number
  userName: string
}

interface GroupOption {
  groupId: number
  groupName: string
}
