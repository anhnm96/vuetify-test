<script setup lang="ts">
import type { SearchTimeResponse } from '~/types/schedule'
import { searchFreeTime } from '~/services/schedule'

const props = defineProps<{
  startDate: string
  startTime: string
  users: UserOption[]
}>()

const emit = defineEmits<{
  close: [value?: SearchTimeResponse]
  afterLeave: []
}>()

const form = reactive({ searchDate: props.startDate, searchTime: props.startTime, alldayOut: false })
const result = ref<SearchTimeResponse>()

function onBlurTimePicker() {
  if (!form.searchTime) form.searchTime = props.startTime
}

const {
  selectedItems: targetUsers,
  isAllSelected,
  canSelectAllItems,
  hasSelectedItem,
  toggleSelectAll,
  isItemChecked,
  selectItem,
} = useCheckbox({
  items: toRef(() => props.users),
  valueAdapter: u => u.userId,
  initialItem: props.users,
})

const isSearching = ref(false)
const freeTime = ref<SearchTimeResponse[]>([])
async function handleSearchFreeTime() {
  isSearching.value = true
  try {
    const payload = {
      searchDate: form.searchDate,
      searchTime: `${form.searchTime.slice(0, 2)}:${form.searchTime.slice(2)}`,
      alldayOut: form.alldayOut,
      targetUserIds: targetUsers.value,
    }
    const res = await searchFreeTime(payload)
    freeTime.value = res.data.list
    result.value = res.data.list[0]
  } catch (err) {
    console.error(err)
  } finally {
    isSearching.value = false
  }
}
handleSearchFreeTime()

function onSetFreeTime(setClose: () => void) {
  emit('close', result.value)
  setClose()
}
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    title="設備・招待するユーザの空き時間選択"
    :pt="{ panel: { class: 'sm:max-w-md sm:w-full' } }"
    persistent
    @after-leave="$emit('afterLeave')"
  >
    <div class="relative flex flex-col overflow-auto">
      <!-- content -->
      <div class="space-y-4 overflow-auto p-6 pb-4">
        <div class="flex flex-col gap-1">
          <Label>日時</Label>
          <div class="flex items-center gap-2">
            <v-date-input
              :model-value="form.searchDate"
              hide-details autocomplete="off"
              input-format="yyyy-mm-dd"
              readonly
              class="custom-input h-9.5 w-46"
              label="" prepend-icon="" variant="outlined"
              @update:model-value="($event) => form.searchDate = formatDateTime($event)"
            />
            <TimePicker
              v-model="form.searchTime"
              :minute-step="15"
              @blur="onBlurTimePicker"
            />
            <span>以降</span>
          </div>
        </div>
        <!-- 条件 -->
        <div class="flex flex-col gap-1">
          <Label>条件</Label>
          <Checkbox
            v-model="form.alldayOut" :label-props="{ class: 'w-fit' }"
            label="終日の予定を除く"
          />
        </div>
        <!-- 検索対象 -->
        <div class="flex flex-col gap-1">
          <Label>検索対象</Label>
          <div class="mt-1 text-center">
            <!-- table -->
            <div class="h-45 overflow-hidden rounded-2xl border border-elevated bg-abg/60 backdrop-blur-2xl">
              <div class="h-full overflow-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>
                        <div class="flex justify-center">
                          <Checkbox
                            type="checkbox"
                            :indeterminate="hasSelectedItem && !isAllSelected"
                            :model-value="isAllSelected"
                            :disabled="!canSelectAllItems"
                            @change="toggleSelectAll"
                          />
                        </div>
                      </th>
                      <th class="text-left capitalize">
                        ユーザー名
                      </th>
                    </tr>
                  </thead>
                  <tbody class="relative">
                    <tr
                      v-for="(user, index) in users"
                      :key="index"
                      class="cursor-pointer"
                      @click.stop="selectItem(user, index, $event)"
                    >
                      <td class="w-15">
                        <div class="flex justify-center">
                          <Checkbox
                            type="checkbox"
                            :model-value="isItemChecked(user)"
                            @click.stop="selectItem(user, index, $event)"
                          />
                        </div>
                      </td>
                      <td class="min-w-15 text-left" :title="user.userName">
                        <p class="line-clamp-2 break-all">
                          {{ user.userName }}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <Button class="btn-primary mt-2" :loading="isSearching" @click="handleSearchFreeTime">
              上記内容で検索
            </Button>
          </div>
        </div>
        <!-- 空き時間検索結果 -->
        <div class="flex flex-col gap-1">
          <Label>空き時間検索結果</Label>
          <div class="flex flex-col gap-2">
            <Radio
              v-for="(time, index) in freeTime" :key="index"
              v-model="result" :value="time" name="res"
              :label="time.label"
            />
          </div>
        </div>
      </div>
      <!-- actions -->
      <div class="flex justify-between gap-2 p-4 pt-2">
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-text min-w-btn"
            @click="setClose();"
          >
            キャンセル
          </button>
        </div>
        <Button
          class="btn-primary min-w-btn"
          :disabled="!result"
          @click="onSetFreeTime(setClose)"
        >
          設定
        </Button>
      </div>
    </div>
  </Dialog>
</template>
