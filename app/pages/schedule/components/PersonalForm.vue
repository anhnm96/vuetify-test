<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem, UpsertDetailSchedulePayload } from '@/types/schedule'
import dayjs from 'dayjs/esm'
import { omit } from 'lodash-es'
import { coloredIcons, icons, SCHEDULE_CODE_LABEL_MAP, SCHEDULE_TYPE_LIST, textColors } from '~/constants/schedule'
import { getEventDetail, upsertDetailSchedule } from '~/services/schedule'
import RepeatMannerConfirmDialog from './RepeatMannerConfirmDialog.vue'
import RepeatSettingsDialog from './RepeatSettingsDialog.vue'

const props = defineProps<{
  startTimestamp: number
  endTimestamp?: number
  calendars: EditCalendarItem[]
  event?: DetailPersonalScheduleEvent
  setClose: () => void
}>()
const emit = defineEmits<{
  close: [value?: boolean]
}>()

const scheduleCd = defineModel<number>()
const isEditMode = !!props.event
const toast = useToast()
const dialogStore = useDialogStore()

const scheduleSchema = {
  scheduleTitle: 'required',
  alldayFlg: { one_of: ['0', '1'] },
  startDate: 'required',
  startTime: { required_if: ['alldayFlg', '0'] },
  endDate: 'required',
  endTime: { required_if: ['alldayFlg', '0'] },
  calendarId: 'required',
}

const formId = useId()
const formRef = useTemplateRef('formRef')
const startDate = formatDateTime(props.startTimestamp)
const endDate = props.endTimestamp ? formatDateTime(props.endTimestamp) : startDate
const endTime = props.startTimestamp !== props.endTimestamp ? dayjs(props.endTimestamp).format('HH:mm') : dayjs(props.startTimestamp).add(30, 'minute').format('HH:mm')
const repeatForm = shallowRef()
const repeatFlg = ref(false)

const initialValues: Record<string, any> = reactive({
  scheduleCd: 1,
  scheduleTitle: '無題の予定',
  alldayFlg: '0',
  calendarId: props.calendars[0]?.calendarId,
  startDate,
  startTime: dayjs(props.startTimestamp).format('HH:mm'),
  endDate,
  endTime,
  scheduleIconCd: '00',
  scheduleColor: '000000',
  notificationCd1: '01',
  notificationTime1: 0,
  notificationTimeUnit1: 1,
  notificationCd2: '01',
  notificationTime2: 0,
  notificationTimeUnit2: 1,
  privateScheduleFlg: '0',
  // undefined while the schedule is public; defaults to '1' once it is made private
  privateScheduleFlgOption: undefined,
})
if (props.event) {
  let [startDate, startTime] = props.event.startDateString.split(' ') as [string, string]
  let [endDate, endTime] = props.event.endDateString.split(' ') as [string, string]
  // hh:mm:ss -> hhmm
  startTime = startTime.replace(':', '').slice(0, 4)
  endTime = endTime.replace(':', '').slice(0, 4)

  Object.assign(initialValues, {
    scheduleCd: props.event.scheduleCd,
    scheduleTitle: props.event.scheduleTitle,
    alldayFlg: props.event.alldayFlg,
    calendarId: props.event.calendarId,
    calendarIds: props.event.calendarIds,
    startDate,
    startTime,
    endDate,
    endTime,
    scheduleLocation: props.event.scheduleLocation,
    details: props.event.details,
    urlLink: props.event.urlLink,
    scheduleIconCd: props.event.scheduleIconCd,
    scheduleColor: props.event.scheduleColor ?? '000000',
    scheduleId: props.event.scheduleId,
    notificationCd1: props.event.notificationCd1 ?? '01',
    notificationTime1: props.event.notificationTime1 ?? 0,
    notificationTimeUnit1: props.event.notificationTimeUnit1 ?? 1,
    notificationCd2: props.event.notificationCd2 ?? '01',
    notificationTime2: props.event.notificationTime2 ?? 0,
    notificationTimeUnit2: props.event.notificationTimeUnit2 ?? 1,
    privateScheduleFlg: props.event.privateScheduleFlg === '2' ? '1' : props.event.privateScheduleFlg,
    privateScheduleFlgOption: ['1', '2'].includes(props.event.privateScheduleFlg) ? props.event.privateScheduleFlg : undefined,
  })
}

const { refresh: refreshSchedule, status: fetchScheduleStatus } = useAsyncData(
  `schedule/${props.event?.scheduleId}`,
  () => getEventDetail('schedule'),
  { immediate: isEditMode, transform: (data) => {
    try {
      let [startDate, startTime] = data.startDateString.split(' ') as [string, string]
      let [endDate, endTime] = data.endDateString.split(' ') as [string, string]
      // hh:mm:ss -> hhmm
      startTime = startTime.replace(':', '').slice(0, 4)
      endTime = endTime.replace(':', '').slice(0, 4)
      formRef.value?.setValues({
        ...initialValues,
        ...{
          // scheduleCd: data.scheduleCd,
          scheduleTitle: data.scheduleTitle,
          alldayFlg: data.alldayFlg,
          calendarId: data.calendarId,
          calendarIds: data.calendarIds,
          startDate,
          startTime,
          endDate,
          endTime,
          scheduleLocation: data.scheduleLocation,
          details: data.details,
          urlLink: data.urlLink,
          scheduleIconCd: data.scheduleIconCd,
          scheduleColor: data.scheduleColor ?? '000000',
          scheduleId: data.scheduleId,
          notificationCd1: data.notificationCd1 ?? '01',
          notificationTime1: data.notificationTime1 ?? 0,
          notificationTimeUnit1: data.notificationTimeUnit1 ?? 1,
          notificationCd2: data.notificationCd2 ?? '01',
          notificationTime2: data.notificationTime2 ?? 0,
          notificationTimeUnit2: data.notificationTimeUnit2 ?? 1,
          privateScheduleFlg: data.privateScheduleFlg === '2' ? '1' : data.privateScheduleFlg,
          privateScheduleFlgOption: ['1', '2'].includes(data.privateScheduleFlg) ? data.privateScheduleFlg : undefined,
        },
      })
      repeatForm.value = data.repeat
      if (repeatForm.value) repeatFlg.value = true
      return data
    } catch (err) {
      console.error('Failed to transform schedule data', err)
      return null
    }
  } },
)

async function onChangeRepeatFlg(value: boolean) {
  repeatFlg.value = value
  if (!value) return
  openRepeatDialog()
}
async function openRepeatDialog() {
  const res = await dialogStore.showDialog({
    component: markRaw(RepeatSettingsDialog),
    props: {
      initialValues: repeatForm.value,
      startDate: formRef.value!.values.startDate,
    },
  })
  if (res) repeatForm.value = res
  return res
}

// Keep the radio option in sync with the checkbox: default to '1' when made
// private, clear it (undefined) when the schedule is public again.
function onPrivateScheduleFlgChange(value: string, handleChange: (e: unknown) => void, setFieldValue: (field: string, value: unknown) => void) {
  handleChange(value)
  setFieldValue('privateScheduleFlgOption', value === '1' ? '1' : undefined)
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

    if (repeatFlg.value) {
      payload.repeat = repeatForm.value
      if (isEditMode) {
        const editManner = await dialogStore.showDialog({ component: markRaw(RepeatMannerConfirmDialog) })
        if (!editManner) return
        payload.repeat.editManner = editManner
      }
    }

    await upsertDetailSchedule(payload as UpsertDetailSchedulePayload)
    emit('close', true)
    props.setClose()
    toast.show({ title: `予定を${isEditMode ? '更新' : '登録'}しました。`, severity: 'success' })
  } catch (err: unknown) {
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

const notificationSettings = [
  { label: '通知しない', value: '01' },
  { label: 'ポップ', value: '03' },
]
const notificationUnits = [
  { label: '分前', value: 1 },
  { label: '時間前', value: 60 },
  { label: '日前', value: 1440 },
  { label: '週間前', value: 10080 },
]
</script>

<template>
  <Form
    ref="formRef"
    v-slot="form"
    class="relative flex flex-col overflow-auto"
    :validation-schema="scheduleSchema"
    :initial-values
    @submit="submitForm"
    @invalid-submit="onInvalidSubmit"
  >
    <InnerLoading v-if="fetchScheduleStatus === 'pending'" />
    <div v-else-if="fetchScheduleStatus === 'error'" class="absolute inset-0 z-10 grid place-items-center bg-abg/60 backdrop-blur-xs">
      <div class="flex flex-col items-center gap-2">
        <p>データの取得に失敗しました。</p>
        <button class="btn btn-outline-primary" @click="refreshSchedule()">
          再読み込み
        </button>
      </div>
    </div>
    <!-- content -->
    <div class="space-y-4 overflow-auto p-6 pb-4">
      <!-- 種類 -->
      <div class="flex flex-col gap-1">
        <Label :for="`scheduleCd__${formId}`">種類</Label>
        <div v-if="!isEditMode" class="flex flex-wrap gap-4">
          <Radio
            v-for="option in SCHEDULE_TYPE_LIST"
            :key="option.value"
            v-model="scheduleCd" :value="option.value" :label="option.label"
          />
        </div>
        <p v-else>
          {{ SCHEDULE_CODE_LABEL_MAP[form.values.scheduleCd] }}
        </p>
      </div>
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
        <div class="mt-1 flex items-center gap-4">
          <!-- 終日 -->
          <Field v-slot="{ field }" name="alldayFlg">
            <Checkbox
              v-bind="field" label="終日" :label-props="{ class: 'w-fit' }"
              true-value="1" false-value="0"
            />
          </Field>
          <!-- 繰り返し -->
          <div class="flex items-center space-x-1">
            <Checkbox
              :model-value="repeatFlg"
              label="繰り返し"
              :label-props="{ class: 'w-fit' }"
              @update:model-value="onChangeRepeatFlg"
            />
            <div v-if="repeatFlg && repeatForm" class="flex items-center leading-tight">
              <p class="text-muted">
                {{ buildRepeatDescription(repeatForm, form.values.startDate) }}
              </p>
              <button
                type="button"
                class="btn btn-link border-none py-0! leading-tight"
                @click="openRepeatDialog"
              >
                変更
              </button>
            </div>
          </div>
        </div>
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
      <!-- 詳細 -->
      <div class="flex flex-col gap-1">
        <Label :for="`details__${formId}`">詳細</Label>
        <Field
          v-slot="{ field }"
          class="inputtext"
          name="details"
        >
          <textarea
            :id="`details__${formId}`"
            v-bind="field"
            class="textarea"
            rows="3"
          />
        </Field>
      </div>
      <!-- URLリンク -->
      <div class="flex flex-col gap-1">
        <Label :for="`urlLink__${formId}`">URLリンク</Label>
        <Field
          :id="`urlLink__${formId}`"
          class="inputtext"
          name="urlLink"
        />
      </div>
      <div class="flex flex-wrap gap-4">
        <!-- カレンダー -->
        <div class="flex w-4/10 grow flex-col gap-1">
          <Label :for="`calendarId__${formId}`">カレンダー</Label>
          <Field
            v-slot="{ value, handleChange }"
            name="calendarId"
            label="カレンダー"
          >
            <v-select
              :id="`calendarId__${formId}`"
              :model-value="value"
              class="custom-input min-h-9.5"
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
        <!-- 複製 -->
        <div class="flex grow flex-col gap-1">
          <Label :for="`calendarIds__${formId}`">この予定の複製を別のカレンダーに追加する</Label>
          <Field
            v-slot="{ value, handleChange }"
            name="calendarIds"
          >
            <v-select
              :id="`calendarIds__${formId}`"
              :model-value="value"
              class="custom-input min-h-9.5"
              label=""
              :items="calendars"
              variant="outlined"
              item-title="calendarName"
              item-value="calendarId"
              hide-details
              multiple
              chips
              @update:model-value="handleChange($event, false)"
            />
          </Field>
        </div>
      </div>
      <!-- アイコン -->
      <div class="flex flex-col gap-1">
        <Label>アイコン</Label>
        <label
          class="inline-flex size-9 cursor-pointer flex-center rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
        >
          <span>なし</span>
          <Field name="scheduleIconCd" type="radio" class="hidden" value="00" />
        </label>
        <div class="flex gap-2">
          <label
            v-for="icon in icons"
            :key="icon.name"
            class="inline-flex cursor-pointer rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
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
            class="inline-flex cursor-pointer rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
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
      <!-- 文字の色 -->
      <div class="flex flex-col gap-1">
        <Label>文字の色</Label>
        <div class="flex gap-2">
          <label
            v-for="color in textColors"
            :key="color"
            class="inline-flex cursor-pointer rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
          >
            <div
              :style="{ backgroundColor: `#${color}` }"
              class="size-8 rounded-full"
            />
            <Field name="scheduleColor" type="radio" :value="color" class="hidden" />
          </label>
        </div>
      </div>
      <!-- 予定の通知 -->
      <div class="flex flex-col gap-1">
        <Label>予定の通知</Label>
        <!-- line 1 -->
        <div class="flex gap-2">
          <Field
            v-slot="{ value, handleChange }"
            name="notificationCd1"
          >
            <v-select
              :id="`calendarId__${formId}`"
              :model-value="value"
              class="custom-input w-40 grow-0!"
              label=""
              :items="notificationSettings"
              variant="outlined"
              item-title="label"
              item-value="value"
              hide-details
              @update:model-value="handleChange($event, false)"
            />
          </Field>
          <div class="w-30 grow-0">
            <Field
              name="notificationTime1" type="number" class="inputtext"
              autocomplete="off" min="0"
            />
          </div>
          <Field
            v-slot="{ value, handleChange }"
            name="notificationTimeUnit1"
          >
            <v-select
              :id="`calendarId__${formId}`"
              :model-value="value"
              class="custom-input w-30 grow-0!"
              label=""
              :items="notificationUnits"
              variant="outlined"
              item-title="label"
              item-value="value"
              hide-details
              @update:model-value="handleChange($event, false)"
            />
          </Field>
        </div>
        <!-- line 2 -->
        <div class="flex gap-2">
          <Field
            v-slot="{ value, handleChange }"
            name="notificationCd2"
          >
            <v-select
              :id="`calendarId__${formId}`"
              :model-value="value"
              class="custom-input w-40 grow-0!"
              label=""
              :items="notificationSettings"
              variant="outlined"
              item-title="label"
              item-value="value"
              hide-details
              @update:model-value="handleChange($event, false)"
            />
          </Field>
          <div class="w-30 grow-0">
            <Field
              name="notificationTime2" type="number" class="inputtext"
              autocomplete="off" min="0"
            />
          </div>
          <Field
            v-slot="{ value, handleChange }"
            name="notificationTimeUnit2"
          >
            <v-select
              :id="`calendarId__${formId}`"
              :model-value="value"
              class="custom-input w-30 grow-0!"
              label=""
              :items="notificationUnits"
              variant="outlined"
              item-title="label"
              item-value="value"
              hide-details
              @update:model-value="handleChange($event, false)"
            />
          </Field>
        </div>
      </div>
      <!-- 予定の表示 -->
      <div class="flex flex-col gap-1">
        <Label>予定の表示</Label>
        <div>
          <!-- 予定を非公開にする -->
          <Field v-slot="{ value, handleChange }" type="checkbox" name="privateScheduleFlg">
            <Checkbox
              :model-value="value" label="予定を非公開にする" :label-props="{ class: 'w-fit' }"
              true-value="1" false-value="0"
              @update:model-value="(val: string) => onPrivateScheduleFlgChange(val, handleChange, form.setFieldValue)"
            />
          </Field>
        </div>
        <div class="flex gap-2">
          <Field
            v-slot="{ field }"
            type="radio"
            value="1"
            name="privateScheduleFlgOption"
          >
            <Radio :disabled="form.values.privateScheduleFlg !== '1'" v-bind="field" value="1" label="予定の日時のみ表示する" />
          </Field>
          <Field
            v-slot="{ field }"
            type="radio"
            value="2"
            name="privateScheduleFlgOption"
          >
            <Radio :disabled="form.values.privateScheduleFlg !== '1'" v-bind="field" value="2" label="予定全体を非表示にする" />
          </Field>
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
        <button
          v-if="isEditMode"
          type="button"
          class="btn btn-text-error min-w-btn"
        >
          削除
        </button>
      </div>
      <div class="flex gap-2">
        <button
          v-if="isEditMode"
          type="button"
          class="btn btn-text-primary min-w-btn"
        >
          複製
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
