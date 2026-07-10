<script setup lang="ts">
import type { RepeatForm } from '~/types/schedule'

const props = defineProps<{
  initialValues?: RepeatForm
  startDate: string
}>()
const emit = defineEmits<{
  close: [value?: RepeatForm]
  afterLeave: []
}>()

const id = useId()
const dialogRef = useTemplateRef('dialogRef')
const form = reactive<RepeatForm>(Object.assign({
  unit: '01',
  weekdays: [],
  standard: '01',
  interval: 1,
  number: 1,
  endDate: props.startDate,
  endCond: '0',
}, props.initialValues ?? {}))
if (!form.number) form.number = 1
if (!form.endDate) form.endDate = props.startDate

// #region 繰り返す間隔
const showRepeatInterval = computed(() => ['01', '05', '06', '07'].includes(form.unit))
const intervalSuffix = computed(() => repeatIntervalSuffix(form.unit))
// #endregion
const showRepeatWeekly = computed(() => form.unit === '05')
function onClickDay(e: MouseEvent) {
  const value = Number((e.target as HTMLInputElement).value)
  if (form.weekdays.length === 1 && form.weekdays.includes(value)) {
    e.preventDefault()
  }
}

const showRepeatStandardMonthly = computed(() => form.unit === '06')

function onChangeEndate(value: Date) {
  console.log('🚀 ~ onChangeEndate ~ value:', typeof value)
  form.endDate = formatDateTime(value)
}

const description = computed(() => buildRepeatDescription(form, props.startDate))

function onClickSubmit() {
  emit('close', form)
  dialogRef.value?.setClose()
}
</script>

<template>
  <Dialog
    ref="dialogRef"
    v-slot="{ setClose }"
    title="繰り返し設定"
    :pt="{ panel: { class: 'sm:max-w-sm sm:w-full' } }"
    persistent
    @after-leave="$emit('afterLeave')"
  >
    <!-- content -->
    <div class="space-y-4 overflow-auto p-6">
      <!-- 繰り返す単位 -->
      <div class="flex flex-col gap-1">
        <Label :for="`repeat-unit__${id}`">繰り返す単位</Label>
        <v-select
          :id="`repeat-unit__${id}`"
          v-model="form.unit"
          class="custom-input"
          label=""
          :items="repeatUnitOptions"
          variant="outlined"
          item-title="label"
          item-value="value"
          hide-details
        />
      </div>
      <!-- 繰り返す曜日 -->
      <div v-if="showRepeatWeekly" class="flex flex-col gap-1">
        <Label>繰り返す曜日</Label>
        <div class="flex gap-2">
          <Checkbox
            v-for="day in repeatDayOptions" :key="day.label"
            v-model="form.weekdays"
            :label="day.label" :value="day.value"
            @click="onClickDay"
          />
        </div>
      </div>
      <!-- 繰り返す基準 -->
      <div v-if="showRepeatStandardMonthly" class="flex flex-col gap-1">
        <Label>繰り返す基準</Label>
        <div class="flex gap-4">
          <Radio
            v-for="option in repeatStandardMonthlyOptions" :key="option.value"
            v-model="form.standard"
            :label="option.label" :value="option.value"
          />
        </div>
      </div>
      <!-- 繰り返す間隔 -->
      <div v-if="showRepeatInterval" class="flex flex-col gap-1">
        <Label :for="`repeat-interval__${id}`">繰り返す間隔</Label>
        <v-select
          :id="`repeat-interval__${id}`"
          v-model="form.interval"
          class="custom-input"
          label=""
          :items="repeatIntervalOptions"
          variant="outlined"
          item-title="label"
          item-value="value"
          hide-details
          :suffix="intervalSuffix"
        />
      </div>
      <!-- 開始日 -->
      <div class="flex flex-col gap-1">
        <Label :for="`start-date__${id}`">開始日</Label>
        <input
          :id="`start-date__${id}`" type="text"
          class="inputtext" disabled :value="props.startDate"
        >
      </div>
      <!-- 終了日 -->
      <div class="flex flex-col gap-1">
        <Label :for="`end-date__${id}`">終了日</Label>
        <div class="flex flex-col gap-2">
          <Radio v-model="form.endCond" name="end-type" label="指定しない" value="0" />
          <div class="flex items-center gap-2">
            <Radio v-model="form.endCond" name="end-type" value="1" />
            <v-select
              v-model="form.number"
              class="custom-input"
              label=""
              :items="repeatIntervalOptions"
              variant="outlined"
              item-title="label"
              item-value="value"
              hide-details
            />
          </div>
          <div class="flex items-center gap-2">
            <Radio v-model="form.endCond" name="end-type" value="2" />
            <v-date-input
              :model-value="form.endDate"
              hide-details
              autocomplete="off" input-format="yyyy-mm-dd"
              class="custom-input"
              label=""
              prepend-icon="" variant="outlined"
              @update:model-value="onChangeEndate($event as any)"
            />
          </div>
        </div>
      </div>
      <!-- 概要 -->
      <div class="flex flex-col gap-1">
        <Label>概要</Label>
        <p>{{ description }}</p>
      </div>
    </div>
    <!-- actions -->
    <div class="flex justify-between gap-2 p-4 pt-0">
      <button
        type="button"
        class="btn btn-text min-w-btn"
        @click="setClose();"
      >
        キャンセル
      </button>
      <button
        type="button"
        class="btn btn-primary min-w-btn"
        @click="onClickSubmit"
      >
        更新
      </button>
    </div>
  </Dialog>
</template>
