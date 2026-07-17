<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { CalendarItem } from '~/types/schedule'
import { isHoliday } from '@holiday-jp/holiday_jp'
import dayjs from 'dayjs/esm'
import Checkbox from '~/components/common/Checkbox.vue'

defineProps<{
  ownCalendarList: CalendarItem[]
  otherCalendarList: CalendarItem[]
}>()

const value = defineModel<Dayjs>({ default: dayjs() })
const _value = computed({
  get() {
    return value.value.toDate()
  },
  set(newVal) {
    value.value = dayjs(newVal)
  },
})
const SIDEBAR_WIDTH_OPEN = '272px'
const SIDEBAR_WIDTH_CLOSED = '0rem'
const openSidebar = defineModel('open', { type: Boolean, default: true })
// calendarIds of the currently checked calendars (own + other)
const selectedCalendarIds = defineModel<(string | number)[]>('selected', { default: () => [] })

function getHolidayEvents(dateString: string) {
  const dateObj = new Date(dateString)
  return isHoliday(dateObj)
}
</script>

<template>
  <aside
    :data-open="openSidebar"
    :style="{ '--sidebar-width': openSidebar ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED }"
    class="group z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-x-hidden overflow-y-auto border-r border-elevated text-default transition-[width] duration-200 ease-linear will-change-[width]"
  >
    <div>
      <v-date-picker
        v-model="_value" show-adjacent-months
        hide-header
        class="date-picker origin-top-left scale-80 bg-transparent!"
        event-color="red"
        :events="getHolidayEvents"
      />
    </div>
    <div class="w-(--sidebar-width-open)" :style="{ '--sidebar-width-open': SIDEBAR_WIDTH_OPEN }">
      <!-- my calendar -->
      <AccordionPanel expanded>
        <AccordionHeader class="px-2 text-base font-medium">
          マイカレンダー
        </AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-1 px-2">
            <Checkbox
              v-for="(item, index) in ownCalendarList" :key="index"
              v-model="selectedCalendarIds"
              :label-props="{ class: 'p-1' }"
              :style="{ '--background': item.calendarColor }"
              :label="item.calendarName"
              :value="item.calendarId"
            />
          </div>
        </AccordionContent>
      </AccordionPanel>
      <!-- other calendar -->
      <AccordionPanel expanded class="mt-6">
        <AccordionHeader class="px-2 text-base font-medium">
          他のカレンダー
        </AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-1 px-2">
            <Checkbox
              v-for="(item, index) in otherCalendarList" :key="index"
              v-model="selectedCalendarIds"
              :label-props="{ class: 'p-1' }"
              :style="{ '--background': item.calendarColor }"
              :label="item.calendarName"
              :value="item.calendarId"
            />
          </div>
        </AccordionContent>
      </AccordionPanel>
    </div>
  </aside>
</template>
