<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem, ScheduleEvent } from '@/types/schedule'
import DetailForms from './DetailForms.vue'
import SimpleForm from './SimpleForm.vue'

const props = defineProps<{
  startTimestamp: number
  endTimestamp?: number
  alldayFlg?: string
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
const simpleForm = ref()
function onShowDetailForm(values: any) {
  showDetailForm.value = true
  simpleForm.value = values
}
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
      :allday-flg="alldayFlg"
      @show-detail-form="onShowDetailForm"
      @close="$emit('close', $event)"
    />
    <DetailForms
      v-else
      :calendars :start-timestamp :end-timestamp
      :event="event"
      :simple-form
      :set-close
      @close="$emit('close', $event)"
    />
  </Dialog>
</template>
