<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { ScheduleEvent, ScheduleEventWithCalendar } from '~/types/schedule'
import dayjs from 'dayjs/esm'
import duration from 'dayjs/esm/plugin/duration'
import relativeTime from 'dayjs/esm/plugin/relativeTime'
import weekday from 'dayjs/esm/plugin/weekday'
import Tab from '~/components/common/tab/Tab.vue'
import TabIndicator from '~/components/common/tab/TabIndicator.vue'
import TabList from '~/components/common/tab/TabList.vue'
import Tabs from '~/components/common/tab/Tabs.vue'
import { coloredIcons, icons } from '~/constants/schedule'
import { getScheduleList, patchDetailSchedule } from '~/services/schedule'
import CreateScheduleDialog from './components/CreateScheduleDialog.vue'
import EventBlock from './components/EventBlock.vue'
import RepeatMannerConfirmDialog from './components/RepeatMannerConfirmDialog.vue'
import Sidebar from './components/Sidebar.vue'
import 'dayjs/esm/locale/ja'

dayjs.locale('ja')
dayjs.extend(weekday)
dayjs.extend(duration)
dayjs.extend(relativeTime)

useHead({
  title: 'スケジュール',
})

const dialogStore = useDialogStore()
const toast = useToast()

const openSidebar = ref(false)
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
const selectedDay = ref<Dayjs>(dayjs('2026-07-12 08:00:00'))
const calendar = useTemplateRef('calendar')

// Date range to fetch: the month containing the anchored day, padded by a week
// on each side so overflow days shown in week/month views are covered too.
const fetchStart = computed(() => selectedDay.value.startOf('month').subtract(7, 'day').format('YYYY-MM-DD'))
const fetchEnd = computed(() => selectedDay.value.endOf('month').add(7, 'day').format('YYYY-MM-DD'))

// Get data for schedule. Refetches whenever the visible period (or view) changes.
const { data: scheduleListRes, refresh: refreshScheduleList, isLoading: isScheduleListLoading } = useQuery({
  key: () => ['schedule-list', fetchStart.value, fetchEnd.value, viewMode.value],
  query: () => getScheduleList(fetchStart.value, fetchEnd.value, viewMode.value),
})

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
      let iconUrl, iconTag
      if (schedule.scheduleIconCd !== '00') {
        let icon = icons.find(i => i.code === schedule.scheduleIconCd)
        if (icon) {
          iconUrl = icon.name
          iconTag = 'Icon'
        }
        if (!icon) {
          icon = coloredIcons.find(i => i.code === schedule.scheduleIconCd)
          if (icon) {
            iconUrl = `/img/schedule/${icon.name}.png`
            iconTag = 'img'
          }
        }
      }
      return {
        ...schedule,
        name: schedule.scheduleTitle,
        start: new Date(schedule.startDateString).getTime(),
        end: new Date(schedule.endDateString).getTime(),
        timed: !allDay,
        iconUrl,
        iconTag,
      }
    })
}

// Re-filter when the sidebar selection changes.
watch(selectedCalendarIds, updateEvents, { deep: true })

function getEventColor(event: any) {
  return `transparent`
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
// ─────────────────────────────────────────────────────────────
// カレンダーのマウス操作 / Tương tác chuột trên lịch
//
// 3つのモードを少数の ref で表現する / Ba chế độ dùng chung vài ref:
//   1. 移動   move   : 既存イベントをドラッグ / kéo event sẵn có
//        → dragEvent / dragTime / dragOriginalStart
//   2. 作成   create : 空き領域をドラッグ / kéo vùng trống
//        → createEvent / createStart
//   3. リサイズ resize: 下端ハンドルで終了時刻を伸縮 / kéo cạnh dưới đổi giờ kết thúc
//        → createEvent(=既存) / createStart / extendOriginal
//
// :time と :day は粒度が違うだけ。granularity 引数で共通化する。
// :time và :day chỉ khác độ chi tiết → gom chung qua tham số granularity.
// ─────────────────────────────────────────────────────────────
type Granularity = 'time' | 'day'

const dragEvent = ref<ScheduleEventWithCalendar | null>(null)
const dragTime = ref<number | null>(null) // 掴んだ位置のオフセット(mouse - start) / offset khi nắm
const dragOriginalStart = ref<number | null>(null) // 実移動かクリックかの判定 / phân biệt kéo vs click
const createEvent = ref<ScheduleEventWithCalendar | null>(null)
const createStart = ref<number | null>(null) // ドラッグ選択の起点 / mốc bắt đầu kéo
const extendOriginal = ref<number | null>(null) // リサイズ取消時に戻す終了時刻 / end để hoàn tác resize
// ドラッグで実移動した直後の click:event を無視する / bỏ qua click ngay sau khi kéo
const suppressClick = ref(false)
// mousedown が既存イベント上か（終日イベントのクリックで作成が走るのを防ぐ）/ chặn tạo mới khi click event cả ngày
const pointerDownOnEvent = ref(false)

// ドラッグ/作成/リサイズ中はイベントのツールチップを抑止する / khi kéo/tạo/resize thì chặn tooltip của event
const isInteracting = computed(() => !!dragEvent.value || !!createEvent.value)

const defaultCalendarColor = () => scheduleListRes.value?.editCalendarList?.[0]?.calendarColor || '000000'

// 粒度に応じたスナップ：時間は15分グリッド、日はそのまま / snap: time theo lưới 15', day giữ nguyên
function snap(ts: number, granularity: Granularity, down = true) {
  return granularity === 'time' ? roundTime(ts, down) : ts
}

// mousedown:event — 既存イベントを掴む（編集可なら timed / 終日どちらも移動可）/ nắm event (sửa được thì cả timed lẫn cả ngày đều kéo)
function startDrag(nativeEvent: Event, { event }: any) {
  if (!event.editable) {
    nativeEvent.preventDefault()
    nativeEvent.stopPropagation()
    return
  }

  // 新しい操作の開始：前回のクリック抑止をリセット / bắt đầu thao tác mới: reset cờ chặn click
  suppressClick.value = false
  pointerDownOnEvent.value = !!event
  // timed で限定しない：終日イベントも :day ハンドラで移動できるようにする
  // Không giới hạn theo timed: event cả ngày cũng kéo được qua handler :day
  dragEvent.value = event
  dragTime.value = null
  dragOriginalStart.value = event.start
  extendOriginal.value = null
}

// mousedown:time / :day — 移動の掴み確定、または新規作成の開始 / xác nhận nắm, hoặc bắt đầu tạo mới
function startInteraction(tms: any, granularity: Granularity) {
  const mouse = toTime(tms)

  // 既存イベントを掴み中 → オフセットを記録し移動待ち / đang nắm event → lưu offset, chờ di chuyển
  if (dragEvent.value && dragTime.value === null) {
    dragTime.value = mouse - dragEvent.value.start
    return
  }

  // 既存イベント上の mousedown では作成しない（クリックは詳細表示に委ねる）
  // mousedown trên event sẵn có thì không tạo mới (nhường click cho dialog chi tiết)
  if (pointerDownOnEvent.value) return

  // 空き領域 → 新規イベント作成を開始（:day は終日）/ vùng trống → tạo mới (:day là cả ngày)
  const start = snap(mouse, granularity)
  createStart.value = start
  createEvent.value = {
    name: `無題の予定`,
    start,
    end: start,
    timed: granularity === 'time',
    calendarColor: defaultCalendarColor(),
  } as ScheduleEventWithCalendar
  events.value.push(createEvent.value)
}

// click:event — ドラッグ移動の直後でなければ詳細/編集ダイアログを開く / mở dialog nếu không phải ngay sau khi kéo
async function onClickEvent(event: Event, data: any) {
  // ドラッグ移動に続くクリックは無視 / bỏ qua click nối tiếp ngay sau khi kéo
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

// 下端ハンドル mousedown — 終了時刻のリサイズを開始（既存イベントを createEvent として扱う）
// mousedown ở cạnh dưới — bắt đầu resize giờ kết thúc (dùng event sẵn có làm createEvent)
function extendBottom(nativeEvent: MouseEvent, event: ScheduleEventWithCalendar) {
  nativeEvent.preventDefault()
  nativeEvent.stopPropagation()
  nativeEvent.stopImmediatePropagation()
  createEvent.value = event
  createStart.value = event.start
  extendOriginal.value = event.end
}

// mousemove:time / :day — 移動、または作成/リサイズの範囲更新 / di chuyển, hoặc cập nhật vùng tạo/resize
function moveInteraction(tms: any, granularity: Granularity) {
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value !== null) {
    // 既存イベントを移動（長さは保持）/ di chuyển event, giữ nguyên độ dài
    suppressClick.value = true
    const duration = dragEvent.value.end - dragEvent.value.start
    const newStart = snap(mouse - dragTime.value, granularity)
    dragEvent.value.start = newStart
    dragEvent.value.end = newStart + duration
  } else if (createEvent.value && createStart.value !== null) {
    // 起点と現在位置で範囲を決める / xác định vùng theo mốc & vị trí hiện tại
    const edge = snap(mouse, granularity, false)
    createEvent.value.start = Math.min(edge, createStart.value)
    createEvent.value.end = Math.max(edge, createStart.value)
  }
}

// テンプレート用バインダ（粒度を固定）/ binder cho template (cố định granularity)
const startTime = (_e: Event, tms: any) => startInteraction(tms, 'time')
const startDay = (_e: Event, tms: any) => startInteraction(tms, 'day')
const mouseMove = (_e: Event, tms: any) => moveInteraction(tms, 'time')
const mouseMoveDay = (_e: Event, tms: any) => moveInteraction(tms, 'day')

// mouseup:time / :day — 作成なら登録ダイアログ、移動なら保存 / tạo → dialog đăng ký, di chuyển → lưu
async function endDrag(nativeEvent: Event) {
  // リサイズ操作（下端ハンドル）：作成ダイアログを開かず、変更を保存し、後続の click:event も抑止する
  // Thao tác resize (handle cạnh dưới): không mở dialog tạo mới, lưu thay đổi, và chặn click:event theo sau
  if (createEvent.value && extendOriginal.value) {
    suppressClick.value = true
    // 終了時刻が実際に変わった場合のみ保存（ハンドルの単なるクリックでは保存しない）
    // Chỉ lưu khi giờ kết thúc thực sự thay đổi (click thuần vào handle thì không lưu)
    if (createEvent.value.end !== extendOriginal.value) saveDraggedEvent(createEvent.value)
    resetInteraction()
    return
  }
  if (createEvent.value) {
    const res = await dialogStore.showDialog({
      component: markRaw(CreateScheduleDialog),
      props: {
        startTimestamp: createEvent.value.start,
        endTimestamp: createEvent.value.end,
        calendars: scheduleListRes.value?.editCalendarList || [],
        // 終日エリアで作成した場合は終日フラグを立てる / bật cờ all-day nếu tạo ở vùng all-day
        alldayFlg: createEvent.value.timed === false ? '1' : '0',
      },
    })
    if (res) {
      // 作成成功 → 一覧を再取得 / tạo thành công → tải lại danh sách
      refreshScheduleList()
    } else {
      // 取消 → 仮イベントを一覧から除去 / hủy → gỡ event tạm khỏi danh sách
      events.value = events.value.filter(e => !!e.scheduleId)
    }
  }
  if (dragEvent.value) {
    // 実際に移動した場合のみ保存（クリックは無変更）/ chỉ lưu khi thực sự di chuyển
    const moved = dragOriginalStart.value !== null && dragEvent.value.start !== dragOriginalStart.value
    if (moved) {
      saveDraggedEvent(dragEvent.value)
    }
  }
  resetInteraction()
}

// すべての操作 ref を初期化 / reset toàn bộ ref thao tác
function resetInteraction() {
  dragTime.value = null
  dragEvent.value = null
  dragOriginalStart.value = null
  createEvent.value = null
  createStart.value = null
  extendOriginal.value = null
  pointerDownOnEvent.value = false
}

async function saveDraggedEvent(event: any) {
  const payload: any = {
    start: formatDateTime(event.start, DATE_TIME_FORMAT),
    end: formatDateTime(event.end, DATE_TIME_FORMAT),
  }
  if (event.repeatId) {
    const editManner = await dialogStore.showDialog({ component: markRaw(RepeatMannerConfirmDialog) })
    if (!editManner) {
      event.start = new Date(event.startDateString).getTime()
      event.end = new Date(event.endDateString).getTime()
      return
    }
    payload.repeat = { editManner }
  }
  let id: number | string | undefined
  try {
    id = toast.instance.loading('更新中...', { duration: Infinity })
    await patchDetailSchedule(event.scheduleId, payload)
    // await upsertSimpleSchedule(payload)
    toast.instance.dismiss(id)
    toast.show({ title: '予定を更新しました。', severity: 'success' })
    // resync with the server
    refreshScheduleList()
  } catch (err) {
    toast.show({ title: getErrorMessage(err, '予定更新に失敗しました。'), severity: 'error' })
    event.start = new Date(event.startDateString).getTime()
    event.end = new Date(event.endDateString).getTime()
    console.error(err)
  } finally {
    toast.instance.dismiss(id)
  }
}

// mouseleave — 進行中の操作を取り消す / hủy thao tác đang diễn ra
function cancelDrag() {
  if (createEvent.value) {
    if (extendOriginal.value) {
      // リサイズ中断：終了時刻を元に戻す / hoàn tác resize: khôi phục giờ kết thúc
      createEvent.value.end = extendOriginal.value
    } else {
      // 作成中断：仮イベントを一覧から除去 / hủy tạo: gỡ event tạm khỏi danh sách
      const i = events.value.indexOf(createEvent.value)
      if (i !== -1) events.value.splice(i, 1)
    }
  }
  resetInteraction()
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
  <div class="grid h-screen w-full grid-cols-[auto_1fr] overflow-auto text-default">
    <!-- Sidebar -->
    <Sidebar
      v-model:open="openSidebar"
      v-model="selectedDay"
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
          <TabList class="inline-flex gap-1 rounded-xl border border-elevated bg-elevated/60 p-1 backdrop-blur-sm">
            <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! border border-primary/30 bg-primary/15" />
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
        <div class="flex items-center gap-2">
          <button class="btn btn-outline" @click="goToToday">
            Today
          </button>
          <button class="btn btn-text rounded-full! px-2!" @click="goToPrev">
            <v-icon size="18">
              mdi-chevron-left
            </v-icon>
          </button>
          <button class="btn btn-text rounded-full! px-2!" @click="goToNext">
            <v-icon size="18">
              mdi-chevron-right
            </v-icon>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <h3 class="text-xl font-semibold">
            {{ activeDateLabel }}
          </h3>
        </div>
        <span class="min-w-btn" />
      </div>
      <!-- Calendar Grid -->
      <div class="mt-4 h-full pb-18">
        <div class="relative h-full">
          <InnerLoading v-if="isScheduleListLoading" />
          <v-calendar
            ref="calendar"
            :model-value="selectedDay.toDate()"
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
            @mousedown:day="startDay"
            @mouseleave="cancelDrag"
            @mousemove:time="mouseMove"
            @mousemove:day="mouseMoveDay"
            @mouseup:time="endDrag"
            @mouseup:day="endDrag"
            @click:event="onClickEvent"
          >
            <template #event="{ event, timed, start, singline }">
              <EventBlock :event="event as any" :timed="timed" :start="start" :singline="singline" :dragging="isInteracting" />
              <div
                v-if="timed && event.editable !== false"
                class="v-event-drag-bottom hit-area-y-0.5"
                @mousedown="extendBottom($event, event as any)"
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

:deep(.v-event-timed) {
  user-select: none;
  -webkit-user-select: none;
  border: none;

  &:hover .v-event-drag-bottom::after {
    display: block;
  }
}

.v-event-drag-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
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
}

:deep(.v-event-more) {
  @apply bg-transparent text-primary-500 hover:underline;
}
</style>
