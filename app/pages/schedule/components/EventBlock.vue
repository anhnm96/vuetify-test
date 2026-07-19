<script setup lang="ts">
import type { ScheduleEventWithCalendar } from '~/types/schedule'
import dayjs from 'dayjs/esm'
import { SCHEDULE_CODE_LABEL_MAP } from '~/constants/schedule'

// `event` carries the extra fields index.vue attaches when mapping the list.
// dayjs plugins/locale are configured once by the parent page (index.vue).
defineProps<{
  event: ScheduleEventWithCalendar & { iconUrl?: string, iconTag?: string }
  timed?: boolean
  start?: boolean
  singline?: boolean
  // suppress the tooltip while a calendar interaction (drag/create/resize) is
  // in progress, so it doesn't pop up as the pointer sweeps across events
  dragging?: boolean
}>()

function getDuration(d1: string, d2: string, isAllday: boolean) {
  const start = dayjs(d1)
  const end = dayjs(d2)
  const diff = dayjs.duration(end.diff(start))
  if (isAllday) return diff.humanize()
  let res = ''
  if (diff.days() > 0) res += `${diff.days()}日`
  if (diff.hours() > 0) res += `${diff.hours()}時間`
  if (diff.minutes() > 0) res += `${diff.minutes()}分`
  return res
}
</script>

<template>
  <div
    class="v-event-draggable event-block"
    :style="{ '--event-color': `#${event.calendarColor}` }"
  >
    <span v-if="start && timed" class="v-event-summary">
      <img v-if="event.iconTag === 'img'" :src="event.iconUrl" class="mr-0.5 inline size-3">
      <Icon v-if="event.iconTag === 'Icon'" :name="event.iconUrl!" size="16" class="mr-0.5 translate-y-0.5" />
      <strong>{{ event.name }}</strong>
      <template v-if="singline">, </template>
      <br v-else>
      {{ formatDateTime(event.start, 'H:mm') }} ～ {{ formatDateTime(event.end, 'H:mm') }}
    </span>
    <span v-else class="v-event-summary">{{ event.name }}</span>
    <Tooltip
      v-if="event.scheduleId"
      :disabled="dragging"
      placement="right"
      class="min-w-60"
      :style="{ '--event-color': `#${event.calendarColor}`, 'maxWidth': 'min(360px, calc(100vw - 2rem))' }"
    >
      <!-- header -->
      <div class="flex gap-2">
        <span class="h-8 w-1 rounded-full bg-(--event-color)" />
        <div class="flex flex-col">
          <span class="text-truncate text-base leading-tight font-semibold">{{ event.name }}</span>
          <span class="text-xs leading-tight font-medium text-muted">{{ SCHEDULE_CODE_LABEL_MAP[event.scheduleCd] }}</span>
        </div>
      </div>
      <!-- body -->
      <div class="mt-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
        <!-- time -->
        <div v-if="event.alldayFlg === '0' && dayjs(event.start).isSame(dayjs(event.end), 'day')" class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-clock-time-seven-outline
          </v-icon>
          <span>{{ formatDateTime(event.startDateString, 'HH:mm') }} ～ {{ formatDateTime(event.endDateString, 'HH:mm') }}</span>
        </div>
        <!-- date -->
        <div class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-calendar-blank-outline
          </v-icon>
          <span v-if="dayjs(event.start).isSame(dayjs(event.end), 'day')">{{ dayjs(event.startDateString).format('M月D日（dd）') }}</span>
          <span v-else>
            <template v-if="event.alldayFlg === '1'">{{ dayjs(event.startDateString).format('M月D日（dd）') }} ～ {{ dayjs(event.endDateString).format('M月D日（dd）') }}</template>
            <template v-else>{{ dayjs(event.startDateString).format('M月D日（dd）HH:mm') }} ～<br>{{ dayjs(event.endDateString).format('M月D日（dd）HH:mm') }}</template>
          </span>
        </div>
        <!-- duration -->
        <div class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-alarm
          </v-icon>
          <span>{{ getDuration(event.startDate, event.endDate, event.alldayFlg === '1') }}</span>
        </div>
        <!-- calendar name -->
        <div class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-calendar-account-outline
          </v-icon>
          <span>{{ event.calendarName }}</span>
        </div>
        <!-- invitees -->
        <div v-if="event.memberNames" class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-account-group-outline
          </v-icon>
          <span>{{ event.memberNames }}</span>
        </div>
        <!-- location -->
        <div v-if="event.scheduleLocation" class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-map-marker-outline
          </v-icon>
          <span>{{ event.scheduleLocation }}</span>
        </div>
        <!-- url link -->
        <div v-if="event.urlLink" class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-link
          </v-icon>
          <a
            :href="event.urlLink"
            target="_blank" rel="noopener noreferrer"
            class="text-primary-500 hover:underline"
          >{{ event.urlLink }}</a>
        </div>
        <!-- details -->
        <div v-if="event.details" class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-information-outline
          </v-icon>
          <span>{{ event.details }}</span>
        </div>
        <!-- register -->
        <div v-if="event.createUserName" class="flex items-start gap-2 leading-tight">
          <v-icon class="translate-y-px" size="12" style="color: var(--event-color)">
            mdi-account-edit-outline
          </v-icon>
          <span>{{ event.createUserName }}</span>
        </div>
      </div>
    </Tooltip>
  </div>
</template>

<style scoped>
@reference '#tailwind.css';

.v-event-draggable {
  padding-left: 6px;
}

.event-block {
  @apply rounded-md bg-(--event-color)/20 hover:bg-(--event-color)/25 border-l-4 border-(--event-color) text-(--event-color) h-full transition-colors;
  color: color-mix(in srgb, var(--event-color) 100%, black 30%);
}

.dark .event-block {
  color: color-mix(in srgb, var(--event-color) 100%, white 30%);
}
</style>
