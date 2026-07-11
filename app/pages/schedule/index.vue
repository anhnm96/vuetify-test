<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { ScheduleEvent, ScheduleEventWithCalendar, UpsertSimpleSchedulePayload } from '~/types/schedule'
import dayjs from 'dayjs/esm'
import weekday from 'dayjs/esm/plugin/weekday'
// import Tab from '~/components/common/tab/Tab.vue'
// import TabIndicator from '~/components/common/tab/TabIndicator.vue'
// import TabList from '~/components/common/tab/TabList.vue'
// import Tabs from '~/components/common/tab/Tabs.vue'
import CreateScheduleDialog from './components/CreateScheduleDialog.vue'
import Sidebar from './components/Sidebar.vue'
import { getScheduleList, upsertSimpleSchedule } from '~/services/schedule'
import 'dayjs/esm/locale/ja'

dayjs.locale('ja')
dayjs.extend(weekday)

useHead({
  title: 'スケジュール',
})

const dialogStore = useDialogStore()
const toast = useToast()

const openSidebar = ref(true)
const selectedCalendarIds = ref<(string | number)[]>([])

// main content
const VIEW_MODE = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const
type ViewMode = ValueOf<typeof VIEW_MODE>

const events = ref<ScheduleEvent[]>([])
// Currently selected view (1: Day, 2: Week, 3: Month, 4: Year)
const viewMode = ref<ViewMode>(VIEW_MODE.WEEK)
// The day the view is anchored to. Drives the visible date range.
const selectedDay = ref<Dayjs>(dayjs())
const calendar = useTemplateRef('calendar')
const calendarValue = ref('')

// Date range to fetch: the month containing the anchored day, padded by a week
// on each side so overflow days shown in week/month views are covered too.
const fetchStart = computed(() => selectedDay.value.startOf('month').subtract(7, 'day').format('YYYY-MM-DD'))
const fetchEnd = computed(() => selectedDay.value.endOf('month').add(7, 'day').format('YYYY-MM-DD'))

// Get data for schedule. Refetches whenever the visible period (or view) changes.
const { data: scheduleListRes, refresh: refreshScheduleList, pending: isScheduleListLoading } = await useAsyncData(
  () => getScheduleList(fetchStart.value, fetchEnd.value, viewMode.value),
  { watch: [fetchStart, fetchEnd] },
)

// Initialize the sidebar selection once, from the first response.
let selectionInitialized = false
watch(scheduleListRes, (value) => {
  if (value && !selectionInitialized) {
    selectionInitialized = true
    selectedCalendarIds.value = [...(value.ownCalendarList ?? []), ...(value.otherCalendarList ?? [])]
      .map(calendar => calendar.calendarId)
  }
  // Re-filter once new data arrives after navigation.
  updateEvents()
}, { immediate: true })
// Monday of the week containing the selected day.
const weekStart = computed(() => {
  const offset = (selectedDay.value.day() + 7) % 7 // days since Monday (Sun=0 -> 6)
  return selectedDay.value.subtract(offset, 'day').startOf('day')
})

// Label shown for the active date range, e.g. "Jun 15 - 21, 2026".
const activeDateLabel = computed(() => {
  if (viewMode.value === VIEW_MODE.DAY) {
    return selectedDay.value.format('YYYY年MM月DD日(ddd)')
  }

  if (viewMode.value === VIEW_MODE.WEEK) {
    const start = weekStart.value
    const end = weekStart.value.add(6, 'day')

    if (start.isSame(end, 'month')) {
      return `${start.format('YYYY年MM月DD')} - ${end.format('DD日')}`
    }
    if (start.isSame(end, 'year')) {
      return `${start.format('YYYY年MM月DD日')} - ${end.format('MM月DD日')}`
    }
    return `${start.format('YYYY年MM月DD日')} - ${end.format('YYYY年MM月DD日')}`
  }
  if (viewMode.value === VIEW_MODE.MONTH) {
    return selectedDay.value.format('YYYY年MM月')
  }
  return selectedDay.value.format('YYYY年MM月')
})

function goToToday() {
  selectedDay.value = dayjs()
  calendarValue.value = dayjs().format('YYYY-MM-DD')
}

function goToPrev() {
  calendar.value?.prev()
  if (viewMode.value === VIEW_MODE.DAY) {
    selectedDay.value = selectedDay.value.subtract(1, 'day')
  }
  if (viewMode.value === VIEW_MODE.WEEK) {
    selectedDay.value = selectedDay.value.subtract(1, 'week')
  }
  if (viewMode.value === VIEW_MODE.MONTH) {
    selectedDay.value = selectedDay.value.subtract(1, 'month')
  }
}

function goToNext() {
  calendar.value?.next()
  if (viewMode.value === VIEW_MODE.DAY) {
    selectedDay.value = selectedDay.value.add(1, 'day')
  }
  if (viewMode.value === VIEW_MODE.WEEK) {
    selectedDay.value = selectedDay.value.add(1, 'week')
  }
  if (viewMode.value === VIEW_MODE.MONTH) {
    selectedDay.value = selectedDay.value.add(1, 'month')
  }
}

function updateEvents() {
  const selected = new Set(selectedCalendarIds.value.map(String))

  events.value = (scheduleListRes.value?.scheduleList ?? [])
    .filter((schedule) => {
      // only show events whose calendar is checked in the sidebar
      if (!selected.has(String(schedule.viewCalendarId))) {
        return false
      }
      return true
    })
    .map((schedule) => {
      const allDay = schedule.alldayFlg === '1'
      return {
        ...schedule,
        name: schedule.scheduleTitle,
        start: new Date(schedule.startDateString).getTime(),
        end: new Date(schedule.endDateString).getTime(),
        timed: !allDay,
      }
    })
}

// Re-filter when the sidebar selection changes.
watch(selectedCalendarIds, updateEvents, { deep: true })

function getEventColor(event: any) {
  return `#${event.calendarColor}`
}
// #region now line
function nowY() {
  return calendar.value ? `${calendar.value.timeToY?.(calendar.value.times.now)}px` : '-10px'
}

let updateInterval: NodeJS.Timeout
onMounted(() => {
  scrollToTime()
  updateInterval = setInterval(() => calendar.value?.updateTimes(), 60_000)
})

onUnmounted(() => {
  clearInterval(updateInterval)
})

function getCurrentTime() {
  return calendar.value ? calendar.value.times.now.hour * 60 + calendar.value.times.now.minute : 0
}
function scrollToTime() {
  const time = getCurrentTime()
  const first = Math.max(0, time - (time % 30) - 30)
  calendar.value?.scrollToTime(first)
}
// #endregion
// drag
const dragEvent = ref<ScheduleEventWithCalendar | null>(null)
const dragTime = ref<number | null>(null)
const createEvent = ref<ScheduleEventWithCalendar | null>(null)
const createStart = ref<number | null>(null)
const extendOriginal = ref<number | null>(null)
// original start of the event being dragged, used to tell a real move from a click
const dragOriginalStart = ref<number | null>(null)
// set when a drag actually moved an event, so the trailing click:event is ignored
const suppressClick = ref(false)

function startDrag(nativeEvent: Event, { event, timed }: any) {
  // new interaction: clear any stale click-suppression from a previous drag
  suppressClick.value = false
  if (event && timed) {
    dragEvent.value = event
    dragTime.value = null
    dragOriginalStart.value = event.start
    extendOriginal.value = null
  }
}

async function startTime(nativeEvent: Event, tms: any) {
  console.log('startTime', tms)
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value === null) {
    const start = dragEvent.value.start
    dragTime.value = mouse - start
  } else {
    // create event
    createStart.value = roundTime(mouse)
    createEvent.value = {
      name: `無題の予定`,
      start: createStart.value,
      end: createStart.value,
      timed: true,
      calendarColor: scheduleListRes.value?.editCalendarList?.[0]?.calendarColor || '000000',
    } as ScheduleEventWithCalendar
    events.value.push(createEvent.value)
  }
}

async function onClickEvent(event: Event, data: any) {
  // this click is the tail of a drag that moved the event — ignore it
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  const res = await dialogStore.showDialog({
    component: markRaw(CreateScheduleDialog),
    props: {
      startTimestamp: data.event.start,
      calendars: scheduleListRes.value?.editCalendarList || [],
      event: data.event,
    },
  })
  if (res) refreshScheduleList()
}

function extendBottom(event: ScheduleEventWithCalendar) {
  createEvent.value = event
  createStart.value = event.start
  extendOriginal.value = event.end
}

function mouseMove(nativeEvent: Event, tms: any) {
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value !== null) {
    suppressClick.value = true
    const start = dragEvent.value.start
    const end = dragEvent.value.end
    const duration = end - start
    const newStartTime = mouse - dragTime.value
    const newStart = roundTime(newStartTime)
    const newEnd = newStart + duration

    console.log('mousemove')
    dragEvent.value.start = newStart
    dragEvent.value.end = newEnd
  } else if (createEvent.value && createStart.value !== null) {
    const mouseRounded = roundTime(mouse, false)
    const min = Math.min(mouseRounded, createStart.value)
    const max = Math.max(mouseRounded, createStart.value)

    createEvent.value.start = min
    createEvent.value.end = max
  }
}

async function endDrag(nativeEvent: Event) {
  console.log('endDrag')

  if (createEvent.value) {
    const res = await dialogStore.showDialog({
      component: markRaw(CreateScheduleDialog),
      props: {
        startTimestamp: createEvent.value.start,
        endTimestamp: createEvent.value.end,
        calendars: scheduleListRes.value?.editCalendarList || [],
      },
    })
    if (res) {
      // event was created successfully, refresh the list
      refreshScheduleList()
    } else {
      // create event was canceled, remove it from the list
      events.value = events.value.filter(e => !!e.scheduleId)
    }
  }
  if (dragEvent.value) {
    // a real drag moved the event to a different time; a click leaves it unchanged
    const moved = dragOriginalStart.value !== null && dragEvent.value.start !== dragOriginalStart.value
    if (moved) {
      saveDraggedEvent(dragEvent.value)
    }
  }
  dragTime.value = null
  dragEvent.value = null
  dragOriginalStart.value = null
  createEvent.value = null
  createStart.value = null
  extendOriginal.value = null
}

async function saveDraggedEvent(event: any) {
  const payload: UpsertSimpleSchedulePayload = {
    scheduleId: event.scheduleId,
    scheduleTitle: event.scheduleTitle,
    calendarId: event.calendarId,
    alldayFlg: event.alldayFlg,
    scheduleLocation: event.scheduleLocation ?? '',
    scheduleIconCd: event.scheduleIconCd ?? '00',
    start: formatDateTime(event.start, DATE_TIME_FORMAT),
    end: formatDateTime(event.end, DATE_TIME_FORMAT),
  }
  let id: number | string | undefined
  try {
    id = toast.instance.loading('更新中...', { duration: 3000 })
    await upsertSimpleSchedule(payload)
    toast.instance.dismiss(id)
    toast.show({ title: '予定を更新しました。' })
  } catch (err) {
    toast.show({ title: '予定更新に失敗しました。' })
    console.error(err)
  } finally {
    toast.instance.dismiss(id)
    // resync with the server
    refreshScheduleList()
  }
}

function cancelDrag() {
  console.log('cancelDrag')
  if (createEvent.value) {
    if (extendOriginal.value) {
      createEvent.value.end = extendOriginal.value
    } else {
      const i = events.value.indexOf(createEvent.value)
      if (i !== -1) {
        events.value.splice(i, 1)
      }
    }
  }

  createEvent.value = null
  createStart.value = null
  dragTime.value = null
  dragEvent.value = null
}

function roundTime(time: number, down = true) {
  const roundTo = 15 // minutes
  const roundDownTime = roundTo * 60 * 1000

  return down
    ? time - time % roundDownTime
    : time + (roundDownTime - (time % roundDownTime))
}

function toTime(tms: any) {
  return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime()
}
</script>

<template>
  <div class="grid w-full grid-cols-[auto_1fr] overflow-auto text-default">
    <!-- Sidebar -->
    <Sidebar
      v-model:open="openSidebar"
      v-model:selected="selectedCalendarIds"
      :own-calendar-list="scheduleListRes?.ownCalendarList || []"
      :other-calendar-list="scheduleListRes?.otherCalendarList || []"
    />
    <!-- Main Content -->
    <div class="p-wrapper flex-1 overflow-hidden pt-4 pb-14">
      <div class="-ml-3.5 flex items-center justify-between gap-4">
        <!-- sidebar toggle -->
        <button class="btn transition-transform" @click="openSidebar = !openSidebar">
          <Icon size="18" :class="[openSidebar && 'rotate-180']" name="tabler:layout-sidebar-left-expand" />
        </button>
        <!-- tabs -->
        <Tabs v-model:value="viewMode" class="text-center">
          <TabList class="inline-flex gap-1 rounded-xl bg-elevated/60 p-1 backdrop-blur-sm">
            <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! bg-primary/10" />
            <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.DAY">
              Day
            </Tab>
            <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.WEEK">
              Week
            </Tab>
            <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.MONTH">
              Month
            </Tab>
          </TabList>
        </Tabs>
        <div class="min-w-btn" />
      </div>
      <!-- current date -->
      <div class="mt-4 flex items-center justify-between gap-4">
        <button class="btn btn-outline" @click="goToToday">
          Today
        </button>
        <div class="flex items-center gap-2">
          <button class="btn btn-text rounded-full! px-2!" @click="goToPrev">
            <v-icon size="18">
              mdi-chevron-left
            </v-icon>
          </button>
          <h3 class="text-xl font-semibold">
            {{ activeDateLabel }}
          </h3>
          <button class="btn btn-text rounded-full! px-2!" @click="goToNext">
            <v-icon size="18">
              mdi-chevron-right
            </v-icon>
          </button>
        </div>
        <span class="min-w-btn" />
      </div>
      <!-- Calendar Grid -->
      <div class="mt-4 h-full pb-18">
        <div class="relative h-full">
          <InnerLoading v-if="isScheduleListLoading" />
          <v-calendar
            ref="calendar"
            v-model="calendarValue"
            class="schedule"
            :event-color="getEventColor"
            event-overlap-mode="column"
            :event-overlap-threshold="30"
            :events="events"
            :type="viewMode"
            :interval-minutes="30"
            :interval-count="48"
            :interval-height="25"
            :interval-format="(time: any) => {
              if (time.hour === 0) return ''
              return `${time.hour}:00`
            }"
            :show-interval-label="(time: any) => {
              return time.minute === 0
            }"
            @mousedown:event="startDrag"
            @mousedown:time="startTime"
            @mouseleave="cancelDrag"
            @mousemove:time="mouseMove"
            @mouseup:time="endDrag"
            @click:event="onClickEvent"
          >
            <template #event="{ event, timed, eventSummary }">
              <div class="v-event-draggable">
                <component :is="eventSummary" />
              </div>
              <div
                v-if="timed"
                class="v-event-drag-bottom"
                @mousedown.stop="extendBottom(event as any)"
              />
            </template>
            <template #day-body="{ date }">
              <div
                v-if="viewMode === VIEW_MODE.DAY || viewMode === VIEW_MODE.WEEK"
                :class="[date === dayjs().format('YYYY-MM-DD') && 'first v-current-time']"
                :style="{ top: nowY() }"
              />
            </template>
          </v-calendar>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference '#tailwind.css';

.date-picker .v-date-picker-month__day--week-start .v-btn__content {
  color: var(--color-red-500) !important;
}
.date-picker .v-date-picker-month__day--week-end .v-btn__content {
  color: var(--color-blue-500) !important;
}

.v-current-time {
  height: 2px;
  background-color: #ea4335;
  position: absolute;
  left: -1px;
  right: 0;
  pointer-events: none;

  &.first::before {
    content: '';
    position: absolute;
    background-color: #ea4335;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-top: -5px;
    margin-left: -6.5px;
  }
}

.schedule {
  @apply bg-surface/50 rounded-lg;

}
.schedule :deep(.v-calendar-weekly__day.v-outside) {
  @apply bg-abg/60;
}

.v-event-draggable {
  padding-left: 6px;
}

.v-event-timed {
  user-select: none;
  -webkit-user-select: none;
}

.v-event-drag-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  height: 4px;
  cursor: ns-resize;

  &::after {
    display: none;
    position: absolute;
    left: 50%;
    height: 4px;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
    width: 16px;
    margin-left: -8px;
    opacity: 0.8;
    content: '';
  }

  &:hover::after {
    display: block;
  }
}
</style>
