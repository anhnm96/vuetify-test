<script setup lang="ts">
import type { EditCalendarItem, ScheduleEvent, UpsertSimpleSchedulePayload } from '@/types/schedule'
import dayjs from 'dayjs/esm'
import { omit } from 'lodash-es'
import { coloredIcons, icons } from '~/constants/schedule'
import { upsertSimpleSchedule } from '~/services/schedule'

const props = defineProps<{
  startTimestamp: number
  endTimestamp?: number
  calendars: EditCalendarItem[]
  event?: ScheduleEvent
  setClose: () => void
}>()
const emit = defineEmits<{
  close: [value?: boolean]
  showDetailForm: []
}>()

const isEditMode = !!props.event
const toast = useToast()
const formId = useId()

const scheduleSchema = {
  scheduleTitle: 'required',
  alldayFlg: { one_of: ['0', '1'] },
  startDate: 'required',
  startTime: { required_if: ['alldayFlg', '0'] },
  endDate: 'required',
  endTime: { required_if: ['alldayFlg', '0'] },
  calendarId: 'required',
}

const formRef = useTemplateRef('formRef')
const startDate = formatDateTime(props.startTimestamp)
const endDate = props.endTimestamp ? formatDateTime(props.endTimestamp) : startDate
const endTime = props.startTimestamp !== props.endTimestamp ? dayjs(props.endTimestamp).format('HH:mm') : dayjs(props.startTimestamp).add(30, 'minute').format('HH:mm')
const initialValues = {
  scheduleTitle: '無題の予定',
  alldayFlg: '0',
  calendarId: props.calendars[0]?.calendarId,
  detailActionCd: 1,
  startDate,
  startTime: dayjs(props.startTimestamp).format('HH:mm'),
  endDate,
  endTime,
  scheduleIconCd: '00',
}
if (props.event) {
  const [startDate, startTime] = props.event.startDateString.split(' ') as [string, string]
  const [endDate, endTime] = props.event.endDateString.split(' ') as [string, string]
  Object.assign(initialValues, {
    scheduleTitle: props.event.scheduleTitle,
    alldayFlg: props.event.alldayFlg,
    calendarId: props.event.calendarId,
    startDate,
    startTime,
    endDate,
    endTime,
    scheduleLocation: props.event.scheduleLocation,
    scheduleIconCd: props.event.scheduleIconCd,
    scheduleId: props.event.scheduleId,
  })
}

async function submitForm(values: any) {
  try {
    // Process the validated form values
    const payload = omit(values, ['startDate', 'startTime', 'endDate', 'endTime'])
    if (values.alldayFlg === '1') {
      payload.start = values.startDate
      payload.end = values.endDate
    } else {
      payload.start = `${values.startDate} ${values.startTime.slice(0, 2)}:${values.startTime.slice(2)}`
      payload.end = `${values.endDate} ${values.endTime.slice(0, 2)}:${values.endTime.slice(2)}`
    }

    await upsertSimpleSchedule(payload as UpsertSimpleSchedulePayload)
    emit('close', true)
    props.setClose()
    toast.show({ title: `予定を${isEditMode ? '更新' : '登録'}しました。`, severity: 'success' })
  } catch (err) {
    console.error(err)
    const defaultMessage = `予定${isEditMode ? '更新' : '登録'}に失敗しました。`
    toast.show({ title: getErrorMessage(err, defaultMessage), severity: 'error' })
  }
}

function onInvalidSubmit({ errors }: any) {
  // focus first invalid basic field
  const basicFieldNamesOrder = ['scheduleTitle', 'startDate', 'startTime', 'endDate', 'endTime', 'calendarId']
  const invalidFieldNames = Object.keys(errors)
  const firstInvalidFieldName = basicFieldNamesOrder.find(field => invalidFieldNames.includes(field))
  if (firstInvalidFieldName) {
    focusField(firstInvalidFieldName)
  }
}

function focusField(fieldName: string) {
  const el = (formRef.value!.$el as HTMLElement).querySelector<HTMLElement>(`[name="${fieldName}"]`)
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <Form
    ref="formRef"
    v-slot="form"
    :validation-schema="scheduleSchema"
    :initial-values class="flex flex-col overflow-auto"
    @submit="submitForm"
    @invalid-submit="onInvalidSubmit"
  >
    <!-- content -->
    <div class="space-y-4 overflow-auto p-6">
      <!-- タイトル -->
      <div class="flex flex-col gap-1">
        <Label required :for="`scheduleTitle__${formId}`">タイトル</Label>
        <Field
          :id="`scheduleTitle__${formId}`"
          class="inputtext"
          :class="[form.errors.scheduleTitle && 'invalid']"
          name="scheduleTitle"
          label="タイトル"
          @input="form.setFieldError('name', '')"
        />
        <TransitionHeight :show="!!form.errors.scheduleTitle">
          <ErrorMessage name="scheduleTitle" class="text-error" />
        </TransitionHeight>
      </div>
      <!-- 日時 -->
      <div class="flex flex-col gap-1">
        <Label>日時</Label>
        <div class="flex items-start gap-2">
          <!-- startDate -->
          <div class="flex flex-col gap-1">
            <Field
              v-slot="{ value, handleChange }"
              name="startDate"
              label="日時"
            >
              <v-date-input
                :class="[form.errors.startDate && 'invalid']"
                :model-value="value"
                hide-details autocomplete="off"
                input-format="yyyy-mm-dd"
                class="custom-input h-9.5 w-46"
                label="" prepend-icon="" variant="outlined"
                @update:model-value="($event) => handleChange(formatDateTime($event), false)"
              />
            </Field>
            <TransitionHeight :show="!!form.errors.startDate">
              <ErrorMessage name="startDate" class="text-error" />
            </TransitionHeight>
          </div>
          <!-- startTime -->
          <div v-show="form.values.alldayFlg === '0'" class="flex flex-col gap-1">
            <Field
              v-slot="{ handleChange, value }"
              name="startTime"
              label="日時"
            >
              <TimePicker
                :model-value="value" :class="[form.errors.startTime && 'invalid']"
                :minute-step="15"
                @update:model-value="handleChange($event, false)"
              />
            </Field>
            <TransitionHeight :show="!!form.errors.startTime">
              <ErrorMessage name="startTime" class="text-error" />
            </TransitionHeight>
          </div>
          <span class="flex h-9 items-center">～</span>
          <!-- endDate -->
          <div class="flex flex-col gap-1">
            <Field
              v-slot="{ value, handleChange }"
              name="endDate"
              label="日時"
            >
              <v-date-input
                :class="[form.errors.endDate && 'invalid']"
                :model-value="value"
                hide-details autocomplete="off" input-format="yyyy-mm-dd"
                class="custom-input h-9.5 w-46"
                label="" prepend-icon="" variant="outlined"
                @update:model-value="($event) => handleChange(formatDateTime($event), false)"
              />
            </Field>
            <TransitionHeight :show="!!form.errors.endDate">
              <ErrorMessage name="endDate" class="text-error" />
            </TransitionHeight>
          </div>
          <!-- endTime -->
          <div v-show="form.values.alldayFlg === '0'" class="flex flex-col gap-1">
            <Field
              v-slot="{ handleChange, value }"
              name="endTime"
              label="日時"
            >
              <TimePicker
                :model-value="value" :class="[form.errors.endTime && 'invalid']"
                :minute-step="15"
                @update:model-value="handleChange($event, false)"
              />
            </Field>
            <TransitionHeight :show="!!form.errors.endTime">
              <ErrorMessage name="endTime" class="text-error" />
            </TransitionHeight>
          </div>
        </div>
        <!-- 終日 -->
        <Field v-slot="{ field }" name="alldayFlg">
          <Checkbox
            v-bind="field" label="終日" :label-props="{ class: 'mt-1 w-fit' }"
            true-value="1" false-value="0"
          />
        </Field>
      </div>
      <!-- 場所 -->
      <div class="flex flex-col gap-1">
        <Label :for="`scheduleLocation__${formId}`">場所</Label>
        <Field
          :id="`scheduleLocation__${formId}`"
          class="inputtext"
          name="scheduleLocation"
        />
      </div>
      <!-- カレンダー -->
      <div class="flex flex-col gap-1">
        <Label :for="`calendarId__${formId}`">カレンダー</Label>
        <Field
          v-slot="{ value, handleChange }"
          name="calendarId"
          label="カレンダー"
        >
          <v-select
            :id="`calendarId__${formId}`"
            :model-value="value"
            class="custom-input h-9.5"
            :class="[form.errors.calendarId && 'invalid']"
            label=""
            :items="calendars"
            variant="outlined"
            item-title="calendarName"
            item-value="calendarId"
            hide-details
            @update:model-value="handleChange($event, false)"
          />
        </Field>
        <TransitionHeight :show="!!form.errors.calendarId">
          <ErrorMessage name="calendarId" class="text-error" />
        </TransitionHeight>
      </div>
      <!-- アイコン -->
      <div class="flex flex-col gap-1">
        <Label>アイコン</Label>
        <label
          class="inline-flex size-9 cursor-pointer flex-center rounded-full p-1 transition hover:bg-white/20 has-checked:bg-white/30"
        >
          <span>なし</span>
          <Field name="scheduleIconCd" type="radio" class="hidden" value="00" />
        </label>
        <div class="flex gap-2">
          <label
            v-for="icon in icons"
            :key="icon.name"
            class="inline-flex cursor-pointer rounded-full p-1 transition hover:bg-white/20 has-checked:bg-white/30"
            :title="icon.title"
          >
            <Icon
              :name="icon.name"
              size="28"
            />
            <Field name="scheduleIconCd" type="radio" :value="icon.code" class="hidden" />
          </label>
        </div>
        <div class="flex gap-2">
          <label
            v-for="icon in coloredIcons"
            :key="icon.name"
            class="inline-flex cursor-pointer rounded-full p-1 transition hover:bg-white/20 has-checked:bg-white/30"
            :title="icon.title"
          >
            <img
              :src="`/img/schedule/${icon.name}.png`"
              size="28"
              class="size-7"
            >
            <Field name="scheduleIconCd" type="radio" :value="icon.code" class="hidden" />
          </label>
        </div>
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
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-text-primary min-w-btn"
          @click="$emit('showDetailForm')"
        >
          詳細入力
        </button>
        <Button
          type="submit"
          :loading="form.isSubmitting"
          class="btn btn-primary min-w-btn"
        >
          {{ isEditMode ? '更新' : '登録' }}
        </Button>
      </div>
    </div>
  </Form>
</template>
