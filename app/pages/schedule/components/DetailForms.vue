<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem } from '@/types/schedule'
import { SCHEDULE_CODES } from '~/constants/schedule'
import MeetingForm from './MeetingForm.vue'
import PersonalForm from './PersonalForm.vue'
import TaskForm from './TaskForm.vue'

const props = defineProps<{
  startTimestamp: number
  endTimestamp?: number
  calendars: EditCalendarItem[]
  event?: DetailPersonalScheduleEvent
  setClose: () => void
}>()
defineEmits<{
  close: [value?: boolean]
}>()

const scheduleCd = ref(props.event?.scheduleCd || SCHEDULE_CODES.PERSONAL)
</script>

<template>
  <div class="contents">
    <PersonalForm
      v-if="scheduleCd === SCHEDULE_CODES.PERSONAL"
      v-model="scheduleCd" :event :calendars :start-timestamp :end-timestamp
      :set-close
      @close="$emit('close', $event)"
    />
    <MeetingForm
      v-if="scheduleCd === SCHEDULE_CODES.MEETING"
      v-model="scheduleCd" :event :calendars :start-timestamp :end-timestamp
      :set-close
      @close="$emit('close', $event)"
    />
    <TaskForm
      v-if="scheduleCd === SCHEDULE_CODES.TODO"
      v-model="scheduleCd" :event :calendars :start-timestamp :end-timestamp
      :set-close
      @close="$emit('close', $event)"
    />
  </div>
</template>
