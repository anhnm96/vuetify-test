<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem, ScheduleEvent } from '@/types/schedule'
import DetailForms from './DetailForms.vue'
import SimpleForm from './SimpleForm.vue'

const props = defineProps<{
  startTimestamp: number
  endTimestamp?: number
  calendars: EditCalendarItem[]
  event?: ScheduleEvent | DetailPersonalScheduleEvent | any
}>()
defineEmits<{
  afterLeave: []
  close: [value?: boolean]
}>()

const isEditMode = !!props.event
const title = isEditMode ? '予定編集' : '予定登録'
const showDetailForm = ref(isEditMode)
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    :title="title"
    :pt="{ panel: { class: 'sm:max-w-2xl sm:w-full' } }"
    persistent
    @after-leave="$emit('afterLeave')"
  >
    <SimpleForm
      v-if="!showDetailForm"
      :calendars :start-timestamp :end-timestamp :event :set-close
      @show-detail-form="showDetailForm = true"
      @close="$emit('close', $event)"
    />
    <DetailForms
      v-else
      :calendars :start-timestamp :end-timestamp
      :event="event"
      :set-close
      @close="$emit('close', $event)"
    />
  </Dialog>
</template>
