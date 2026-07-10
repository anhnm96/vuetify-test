import type {
  AttendanceItem,
  DeleteSchedulePayload,
  DetailPersonalScheduleEvent,
  ReplyMeetingAttendancePayload,
  ReplyMeetingAttendanceResponse,
  ScheduleListResponse,
  SearchTimePayload,
  SearchTimeResponse,
  UpsertDetailSchedulePayload,
  UpsertMeetingSchedulePayload,
  UpsertMeetingScheduleResponse,
  UpsertSimpleSchedulePayload,
  UpsertTaskSchedulePayload,
  UpsertTaskScheduleResponse,
} from '~/types/schedule'

export function getScheduleList(start: string, end: string, type: string) {
  return useNuxtApp().$api<ApiResponse<ScheduleListResponse>>('/schedule/list', {
    method: 'POST',
    body: {
      start,
      end,
      widget: false,
      type,
    },
  })
}

export function upsertSimpleSchedule(payload: UpsertSimpleSchedulePayload) {
  return useNuxtApp().$api<ApiResponse<ScheduleListResponse>>('/schedule/edit-simple', {
    method: 'POST',
    body: payload,
  })
}

export function upsertDetailSchedule(payload: UpsertDetailSchedulePayload) {
  return useNuxtApp().$api<ApiResponse<ScheduleListResponse>>('/schedule/edit-detail', {
    method: 'POST',
    body: payload,
  })
}

export function getEventDetail(id: number | string) {
  return useNuxtApp().$api<ApiResponse<DetailPersonalScheduleEvent>>(`/schedule/detail/${id}`)
}

export function getEquipmentList() {
  return useNuxtApp().$api<PaginatedResponse<UserOption>>('/schedule/equipment-list')
}

export function getInviteeList() {
  return useNuxtApp().$api<PaginatedResponse<any>>('/schedule/invitee-list')
}

export function searchFreeTime(payload: SearchTimePayload) {
  return useNuxtApp().$api<PaginatedResponse<SearchTimeResponse>>('/schedule/free-time-search', {
    method: 'POST',
    body: payload,
  })
}

export function upsertMeetingSchedule(payload: UpsertMeetingSchedulePayload) {
  return useNuxtApp().$api<ApiResponse<UpsertMeetingScheduleResponse>>('/schedule/edit-meeting', {
    method: 'POST',
    body: payload,
  })
}

export function replyMeetingAttendance(payload: ReplyMeetingAttendancePayload) {
  return useNuxtApp().$api<ApiResponse<ReplyMeetingAttendanceResponse>>('/schedule/attendance ', {
    method: 'POST',
    body: payload,
  })
}

export function getMeetingAttendance(scheduleId: string) {
  return useNuxtApp().$api<PaginatedResponse<AttendanceItem>>(`/schedule/attendance-list/${scheduleId}`)
}

export function upsertTaskSchedule(payload: UpsertTaskSchedulePayload) {
  return useNuxtApp().$api<ApiResponse<UpsertTaskScheduleResponse>>(`/schedule/todo `, {
    method: 'POST',
    body: payload,
  })
}

export function deleteTaskSchedule(id: string) {
  return useNuxtApp().$api<PaginatedResponse<{ todoListId: number }>>(`/schedule/todo/${id}`, {
    method: 'DELETE',
  })
}

export function deleteSchedule(payload: DeleteSchedulePayload) {
  return useNuxtApp().$api<number>(`/schedule/delete`, {
    method: 'POST',
    body: payload,
  })
}

export function getTaskScheduleCategories() {
  return useNuxtApp().$api<PaginatedResponse<GroupOption>>(`/schedule/todo/categories `)
}
