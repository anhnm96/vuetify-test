export interface ScheduleListResponse {
  editCalendarList: EditCalendarItem[]
  otherCalendarList: CalendarItem[]
  ownCalendarList: CalendarItem[]
  scheduleList: ScheduleEvent[]
}

export interface EditCalendarItem {
  calendarColor: string
  calendarId: number
  calendarName: string
}

export interface CalendarItem {
  calendarCd: string
  calendarColor: string
  calendarId: number
  calendarName: string
  calendarStyle: string
  calendarViewFlg: string
  initSelectId: string
  subCalendarId: string
}
export interface ScheduleEvent {
  alldayFlg: string
  attendanceCd: MaybeNull<string>
  calendarCd: string
  calendarColor: string
  calendarId: number
  calendarName: string
  calendarViewFlg: string
  calendarViewFlg2: string
  createUserId: number
  createUserName: MaybeNull<string>
  details: string
  endDate: string
  endDateString: string
  foreignRefId1: null
  lastUpdateDate: string
  meetingOwnerId: number
  memberNames: MaybeNull<string>
  permissionCd: string
  privateScheduleFlg: string
  referenceScheduleId: null
  repeatId?: number
  repeat?: RepeatForm
  repeatOriginDate: MaybeNull<string>
  scheduleCd: number
  scheduleColor: MaybeNull<string>
  scheduleIconCd: string
  scheduleId: number
  scheduleLocation: string
  scheduleTitle: string
  startDate: string
  startDateString: string
  todoCompletFlg: null
  urlLink: MaybeNull<string>
  userId: number
  viewCalendarCd: string
  viewCalendarId: number
  viewPriorityNumber: number
}

export interface DetailPersonalScheduleEvent extends ScheduleEvent {
  calendarIds?: number[]
  start: string
  end: string
  notificationCd1: string
  notificationTime1: number
  notificationTimeUnit1: number
  notificationCd2: string
  notificationTime2: number
  notificationTimeUnit2: number
  editable?: boolean
  meeting?: Meeting
  groupId: number
  todolistName: string
  todolistText?: string
  importanceDiv: number
  priorityDiv: number
  limitDate?: MaybeNull<string>
  limitTime?: MaybeNull<string>
  complet: boolean
  memberIds: number[]
  todo?: Task
}
export interface Meeting {
  equipment: UserOption[]
  invitees: UserOption[]
  attendanceCd: string
  attendanceName: string
  attendanceEnable: boolean
  ownerUserId: number
}

export interface Task {
  todoListId: number
  groupId: number
  groupName: string
  todolistName: string
  todolistText: string
  importanceDiv: number
  priorityDiv: number
  limitDate: string
  limitTime: string
  complet: boolean
  members: UserOption[]
  memberNum: number
  requestUserId: number
  requestUserName: string
}

export interface ScheduleEventWithCalendar extends ScheduleEvent {
  name: string
  start: number
  end: number
  timed: boolean
}

export interface UpsertSimpleSchedulePayload {
  scheduleTitle: string
  calendarId: number
  start: string
  end: string
  alldayFlg: string
  scheduleLocation: string
  scheduleIconCd: string
  scheduleId?: number
}

interface PersonalDetailSchedulePayload {
  scheduleTypeCd: string
  scheduleTitle: string
  start: string
  end: string
  alldayFlg: string
  scheduleLocation?: string
  details?: string
  urlLink?: string
  scheduleIconCd: string
  scheduleColor: string
  notificationCd1: string
  notificationTime1: number
  notificationTimeUnit1: number
  notificationCd2: string
  notificationTime2: number
  notificationTimeUnit2: number
  privateScheduleFlg: string
  privateScheduleFlgOption?: string
  scheduleId?: number
  repeat?: RepeatForm
}

export interface RepeatForm {
  unit: string
  weekdays: number[]
  standard: string
  interval: number
  endCond: string
  number: number
  endDate: string
  editManner?: string
}

export type UpsertDetailSchedulePayload
  = | (PersonalDetailSchedulePayload & { calendarId: number, calendarIds?: number[] })
    | (PersonalDetailSchedulePayload & { calendarId?: number, calendarIds: number[] })

// meeting types
export interface SearchTimePayload {
  searchDate: string
  searchTime: string
  alldayOut: boolean
  targetUserIds: number[]
}

export interface SearchTimeResponse {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  label: string
  selected: boolean
}

export interface UpsertMeetingSchedulePayload {
  scheduleId?: number
  scheduleTitle: string
  start: string
  end: string
  scheduleLocation?: string
  details?: string
  urlLink?: string
  equipmentIds?: number[]
  inviteeUserIds: number[]
  scheduleIconCd: string
  scheduleColor: string
  notificationCd1: string
  notificationTime1: number
  notificationTimeUnit1: number
  notificationCd2: string
  notificationTime2: number
  notificationTimeUnit2: number
}

export interface UpsertMeetingScheduleResponse {
  scheduleId: number
}

export interface ReplyMeetingAttendancePayload {
  scheduleId: number
  attendanceCd: string
}

export interface ReplyMeetingAttendanceResponse {
  attendanceCd: string
  attendanceName: string
}

export interface AttendanceItem {
  userId: number
  userName: string
  attendanceCd: string
  attendanceName: string
}

export interface UpsertTaskSchedulePayload {
  groupId: number
  todolistName: string
  todolistText?: string
  importanceDiv: number
  priorityDiv: number
  limitDate?: string
  limitTime?: string
  complet: boolean
  memberIds: number[]
}

export interface UpsertTaskScheduleResponse {
  todoListId: number
}

export interface DeleteSchedulePayload {
  scheduleId: number
  repeatEditManner?: number
}
