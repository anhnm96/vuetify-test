<script setup lang="ts">
import { ATTENDANCE_CODE_LABEL_MAP, ATTENDANCE_CODES } from '~/constants/schedule'
import { getMeetingAttendance } from '~/services/schedule'

const props = defineProps<{
  scheduleId: number
}>()

defineEmits<{
  close: []
  afterLeave: []
}>()

const { data, refresh, status } = useAsyncData('attendance-list', () => getMeetingAttendance(props.scheduleId), {
  default: () => [],
  transform: res => res.data.list,
})
const attendanceTypeOptions = [
  { label: '全て表示', value: '-1' },
  { label: ATTENDANCE_CODE_LABEL_MAP[ATTENDANCE_CODES.ATTENDANCE], value: ATTENDANCE_CODES.ATTENDANCE },
  { label: ATTENDANCE_CODE_LABEL_MAP[ATTENDANCE_CODES.ABSENCE], value: ATTENDANCE_CODES.ABSENCE },
  { label: ATTENDANCE_CODE_LABEL_MAP[ATTENDANCE_CODES.NONE], value: ATTENDANCE_CODES.NONE },
]
const selectedFilterCode = ref('-1')

const filteredItems = computed(() => {
  if (selectedFilterCode.value === '-1') return data.value
  return data.value.filter(item => item.attendanceCd === selectedFilterCode.value)
})
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    title="回答一覧"
    :pt="{ panel: { class: 'sm:max-w-md sm:w-full' } }"
    @after-leave="$emit('afterLeave')"
  >
    <div class="relative flex flex-col overflow-auto">
      <InnerLoading v-if="status === 'pending'" />
      <div v-else-if="status === 'error'" class="absolute inset-0 z-10 grid place-items-center bg-abg/60 backdrop-blur-xs">
        <div class="flex flex-col items-center gap-2">
          <p>データの取得に失敗しました。</p>
          <button class="btn btn-outline-primary" @click="refresh()">
            再読み込み
          </button>
        </div>
      </div>
      <!-- content -->
      <div class="space-y-4 overflow-auto p-6 pb-4">
        <v-select
          v-model="selectedFilterCode"
          class="custom-input w-40 grow-0!"
          label=""
          :items="attendanceTypeOptions"
          variant="outlined"
          item-title="label"
          item-value="value"
          hide-details
        />
        <!-- table -->
        <div class="h-45 overflow-hidden rounded-2xl border border-elevated bg-abg/60 backdrop-blur-2xl">
          <div class="h-full overflow-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="w-20">
                    回答状況
                  </th>
                  <th class="text-left capitalize">
                    名前
                  </th>
                </tr>
              </thead>
              <tbody class="relative">
                <tr
                  v-for="(item, index) in filteredItems"
                  :key="index"
                  class="cursor-pointer"
                >
                  <td>
                    <v-chip
                      size="small"
                      class="w-fit"
                      :class="[item.attendanceCd === '01' ? 'bg-primary!'
                        : item.attendanceCd === '02' && 'bg-red-500!']"
                    >
                      {{ item.attendanceName }}
                    </v-chip>
                  </td>
                  <td class="min-w-15 text-left" :title="item.userName">
                    <p class="line-clamp-2 break-all">
                      {{ item.userName }}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- actions -->
      <div class="flex justify-center gap-2 p-4 pt-2">
        <button
          type="button"
          class="btn btn-text min-w-btn"
          @click="setClose();"
        >
          キャンセル
        </button>
      </div>
    </div>
  </Dialog>
</template>
