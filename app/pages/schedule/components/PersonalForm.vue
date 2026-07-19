<script setup lang="ts">
import type { DeleteSchedulePayload, DetailPersonalScheduleEvent, EditCalendarItem, UpsertDetailSchedulePayload } from '@/types/schedule'
import dayjs from 'dayjs/esm'
import { omit } from 'lodash-es'
import { coloredIcons, icons, SCHEDULE_CODE_LABEL_MAP, SCHEDULE_TYPE_LIST, textColors } from '~/constants/schedule'
import { deleteSchedule, getEventDetail, upsertDetailSchedule } from '~/services/schedule'
import RepeatMannerConfirmDialog from './RepeatMannerConfirmDialog.vue'
import RepeatSettingsDialog from './RepeatSettingsDialog.vue'

const props = defineProps<{
  startTimestamp: number
  endTimestamp?: number
  calendars: EditCalendarItem[]
  event?: DetailPersonalScheduleEvent
  simpleForm?: Partial<DetailPersonalScheduleEvent>
  setClose: () => void
}>()
const emit = defineEmits<{
  close: [value?: boolean]
}>()

const scheduleCd = defineModel<number>()
const isEditMode = !!props.event
const toast = useToast()
const dialogStore = useDialogStore()
const scheduleTypeOptions = computed(() => {
  return SCHEDULE_TYPE_LIST
})

const scheduleSchema = {
  scheduleTitle: 'required',
  alldayFlg: { one_of: ['0', '1'] },
  startDate: 'required',
  startTime: { required_if: ['alldayFlg', '0'] },
  endDate: 'required',
  endTime: { required_if: ['alldayFlg', '0'] },
  urlLink: 'optional_url',
  calendarId: 'required',
}

const formId = useId()
const formRef = useTemplateRef('formRef')
const startDate = props.simpleForm?.startDate ?? formatDateTime(props.startTimestamp)
const endDate = props.simpleForm?.endDate ?? (props.endTimestamp ? formatDateTime(props.endTimestamp) : startDate)
const endTime = props.simpleForm?.endTime ?? (props.startTimestamp !== props.endTimestamp ? dayjs(props.endTimestamp).format('HHmm') : dayjs(props.startTimestamp).add(30, 'minute').format('HHmm'))
const repeatForm = shallowRef()
const repeatFlg = ref(false)

const initialValues: Record<string, any> = reactive({
  scheduleCd: 1,
  scheduleTitle: props.simpleForm?.scheduleTitle ?? '無題の予定',
  alldayFlg: props.simpleForm?.alldayFlg ?? '0',
  calendarId: props.simpleForm?.calendarId ?? props.calendars[0]?.calendarId,
  startDate,
  startTime: props.simpleForm?.startTime ?? dayjs(props.startTimestamp).format('HHmm'),
  endDate,
  endTime,
  scheduleLocation: props.simpleForm?.scheduleLocation,
  scheduleIconCd: props.simpleForm?.scheduleIconCd ?? '00',
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

const originalRepeatFlg = ref(false)
const { data: eventDetail, refresh: refreshSchedule, status: fetchScheduleStatus } = useQuery({
  key: () => ['schedule', props.event?.scheduleId || 'new'],
  query: () => getEventDetail('schedule').then((res) => {
    const data = res
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
    if (repeatForm.value) {
      repeatFlg.value = true
      originalRepeatFlg.value = true
    }
    return data
  }),
  enabled: isEditMode,
})
const isEditable = computed(() => !isEditMode || (isEditMode && eventDetail.value?.editable))
const scheduleIcon = computed(() => {
  if (isEditable.value) return
  return icons.find(i => i.code === formRef.value?.values.scheduleIconCd)
})
const scheduleColoredIcon = computed(() => {
  if (isEditable.value) return
  return coloredIcons.find(i => i.code === formRef.value?.values.scheduleIconCd)
})

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

async function duplicateEvent() {
  if (!formRef.value) return
  const res = await formRef.value.validate()
  if (!res.valid) return
  const values = formRef.value.values
  try {
    // 複製なので既存の scheduleId は含めない（新規作成として扱う）
    // Là bản sao nên không gửi scheduleId (xử lý như tạo mới)
    const payload = omit(values, ['scheduleId', 'startDate', 'startTime', 'endDate', 'endTime'])

    if (values.alldayFlg === '1') {
      payload.start = values.startDate
      payload.end = values.endDate
    } else {
      payload.start = `${values.startDate} ${values.startTime.slice(0, 2)}:${values.startTime.slice(2)}`
      payload.end = `${values.endDate} ${values.endTime.slice(0, 2)}:${values.endTime.slice(2)}`
    }

    if (repeatFlg.value) {
      payload.repeat = repeatForm.value
    }

    await upsertDetailSchedule(payload as UpsertDetailSchedulePayload)
    emit('close', true)
    props.setClose()
    toast.show({ title: `予定を複製しました。`, severity: 'success' })
  } catch (err: unknown) {
    console.error(err)
    toast.show({ title: getErrorMessage(err, '予定複製に失敗しました。'), severity: 'error' })
  }
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
      if (originalRepeatFlg.value) {
        const editManner = await dialogStore.showDialog({ component: markRaw(RepeatMannerConfirmDialog) })
        if (!editManner) return
        payload.repeat.editManner = editManner
      } else {
        payload.repeat.editManner = '3'
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

// 開始・終了の前後関係を保証する（終日なら日付のみ、そうでなければ日時で比較）
// Đảm bảo thứ tự trước/sau của bắt đầu-kết thúc (終日 thì so theo ngày, không thì so theo ngày+giờ)
// changed: どちらのフィールドが変更されたか（変更された側を正として、もう一方を合わせる）
// changed: field nào vừa được đổi (giữ nguyên field đó, kéo field còn lại theo)
function enforceDateOrder(changed: 'start' | 'end') {
  const values = formRef.value?.values
  if (!values) return
  const allday = values.alldayFlg === '1'

  if (!values.startDate || !values.endDate) return
  if (!allday && (!values.startTime || !values.endTime)) return

  const startVal = allday ? values.startDate : `${values.startDate} ${values.startTime.slice(0, 2)}:${values.startTime.slice(2)}`
  const endVal = allday ? values.endDate : `${values.endDate} ${values.endTime.slice(0, 2)}:${values.endTime.slice(2)}`

  if (compareDates(startVal, endVal) !== 1) return // start <= end: 問題なし / hợp lệ, không cần sửa

  if (changed === 'start') {
    // 開始が終了より後になった → 終了を開始の30分後に設定する（終日は日付のみ合わせる）
    // Bắt đầu muộn hơn kết thúc → đặt kết thúc muộn hơn bắt đầu mới 30 phút (終日 thì chỉ gán ngày)
    if (allday) {
      formRef.value?.setFieldValue('endDate', values.startDate)
    } else {
      const newEnd = dayjs(startVal).add(30, 'minute')
      formRef.value?.setFieldValue('endDate', newEnd.format('YYYY-MM-DD'))
      formRef.value?.setFieldValue('endTime', newEnd.format('HHmm'))
    }
  } else {
    // 終了が開始より前になった → 開始を終了の30分前に設定する（終日は日付のみ合わせる）
    // Kết thúc sớm hơn bắt đầu → đặt bắt đầu sớm hơn kết thúc mới 30 phút (終日 thì chỉ gán ngày)
    if (allday) {
      formRef.value?.setFieldValue('startDate', values.endDate)
    } else {
      const newStart = dayjs(endVal).subtract(30, 'minute')
      formRef.value?.setFieldValue('startDate', newStart.format('YYYY-MM-DD'))
      formRef.value?.setFieldValue('startTime', newStart.format('HHmm'))
    }
  }
}

watch([() => formRef.value?.values.endDate, () => formRef.value?.values.endTime], () => {
  enforceDateOrder('end')
})

watch([() => formRef.value?.values.startDate, () => formRef.value?.values.startTime], () => {
  enforceDateOrder('start')
})

// 終日フラグの切り替え時にも整合性を再確認する（例: 終日中は日付のみ検証されるため、
// 時刻表示に戻した際に開始時刻＞終了時刻のまま残っている場合がある）
// Cũng kiểm tra lại khi bật/tắt 終日 (all-day) — ví dụ: khi đang all-day chỉ ngày được validate,
// nên lúc quay lại chế độ có giờ, giờ bắt đầu > giờ kết thúc có thể vẫn còn sót lại
watch(() => formRef.value?.values.alldayFlg, () => {
  enforceDateOrder('start')
})

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

const notificationText = computed(() => {
  let text1 = ''
  let text2 = ''
  const values = formRef.value?.values
  if (!values) return
  if (values.notificationCd1 === '01') {
    text1 = '通知しない'
  } else {
    const unit = notificationUnits.find(i => i.value === values.notificationTimeUnit1)
    if (!unit) {
      console.error('Could not find notificationTimeUnit1')
      return
    }
    text1 = `${values.notificationTime1}${unit.label}にポップで通知する`
  }

  if (values.notificationCd2 === '01') {
    text2 = '通知しない'
  } else {
    const unit = notificationUnits.find(i => i.value === values.notificationTimeUnit2)
    if (!unit) {
      console.error('Could not find notificationTimeUnit2')
      return
    }
    text1 = `${values.notificationTime2}${unit.label}にポップで通知する`
  }
  return { text1, text2 }
})

const isDeleting = ref(false)
async function performDelete(payload: DeleteSchedulePayload) {
  try {
    isDeleting.value = true
    await deleteSchedule(payload)
    emit('close', true)
    props.setClose()
    toast.show({ title: `予定を削除しました。`, severity: 'success' })
  } catch (err) {
    console.error(err)
    toast.show({ title: '予定削除に失敗しました。', severity: 'error' })
  } finally {
    isDeleting.value = false
  }
}

async function onConfirmDeleteTask() {
  const scheduleId = formRef.value!.values.scheduleId
  if (originalRepeatFlg.value) {
    const editManner = await dialogStore.showDialog({
      component: markRaw(RepeatMannerConfirmDialog),
      props: { type: '削除' },
    })
    if (!editManner) return
    await performDelete({ scheduleId, repeatEditManner: Number(editManner) })
  } else {
    const res = await dialogStore.showConfirm({
      title: '削除',
      description: '削除します。よろしいですか？',
      severity: 'error',
    })
    if (!res) return
    await performDelete({ scheduleId })
  }
}
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
    <InnerLoading v-if="fetchScheduleStatus === 'pending' || isDeleting" />
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
            v-for="option in scheduleTypeOptions"
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
          v-focus
          class="inputtext"
          :class="[form.errors.scheduleTitle && 'invalid']"
          name="scheduleTitle"
          label="タイトル"
          :disabled="!isEditable"
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
                :disabled="!isEditable"
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
                :disabled="!isEditable"
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
                :disabled="!isEditable"
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
                :disabled="!isEditable"
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
          <Field v-if="isEditable" v-slot="{ value, handleChange }" name="alldayFlg" type="checkbox" checked-value="1" unchecked-value="0">
            <Checkbox
              :model-value="value" label="終日" :label-props="{ class: 'w-fit' }"
              true-value="1" false-value="0"
              @update:model-value="handleChange($event, false)"
            />
          </Field>
          <!-- 繰り返し -->
          <div class="flex items-center space-x-1">
            <Checkbox
              v-if="isEditable"
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
                v-if="isEditable"
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
          :disabled="!isEditable"
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
            :disabled="!isEditable"
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
          :disabled="!isEditable"
          label="URLリンク"
        />
        <TransitionHeight :show="!!form.errors.urlLink">
          <ErrorMessage name="urlLink" class="text-error" />
        </TransitionHeight>
        <a
          v-if="form.values.urlLink"
          target="_blank" rel="noopener noreferrer"
          class="btn btn-link w-fit cursor-pointer p-0!"
          :href="form.values.urlLink"
        >URLを表示</a>
      </div>
      <div class="flex flex-wrap gap-4">
        <!-- カレンダー -->
        <div class="flex w-4/10 grow flex-col gap-1">
          <Label :for="`calendarId__${formId}`">カレンダー</Label>
          <template v-if="isEditable">
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
          </template>
          <p v-else>
            {{ eventDetail?.calendarName }}
          </p>
        </div>
        <!-- 複製 -->
        <div v-if="isEditable" class="flex grow flex-col gap-1">
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
          v-if="isEditable || (!isEditable && !scheduleIcon && !scheduleColoredIcon)"
          class="inline-flex size-9 cursor-pointer flex-center rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
        >
          <span>なし</span>
          <Field name="scheduleIconCd" type="radio" class="hidden" value="00" />
        </label>
        <div v-if="isEditable" class="flex gap-2">
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
        <label
          v-else-if="scheduleIcon"
          class="inline-flex w-fit cursor-pointer rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
          :title="scheduleIcon.title"
        >
          <Icon
            :name="scheduleIcon.name"
            size="28"
          />
          <Field name="scheduleIconCd" type="radio" :value="scheduleIcon.code" class="hidden" />
        </label>
        <div v-if="isEditable" class="flex gap-2">
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
        <label
          v-else-if="scheduleColoredIcon"
          class="inline-flex w-fit cursor-pointer rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
          :title="scheduleColoredIcon.title"
        >
          <img
            :src="`/img/schedule/${scheduleColoredIcon.name}.png`"
            size="28"
            class="size-7"
          >
          <Field name="scheduleIconCd" type="radio" :value="scheduleColoredIcon.code" class="hidden" />
        </label>
      </div>
      <!-- 文字の色 -->
      <div v-if="isEditable" class="flex flex-col gap-1">
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
        <div v-if="isEditable" class="flex gap-2">
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
        <div v-else-if="notificationText">
          {{ notificationText.text1 }}
        </div>
        <!-- line 2 -->
        <div v-if="isEditable" class="flex gap-2">
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
        <div v-else-if="notificationText">
          {{ notificationText.text2 }}
        </div>
      </div>
      <!-- 予定の表示 -->
      <div class="flex flex-col gap-1">
        <Label>予定の表示</Label>
        <template v-if="isEditable">
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
        </template>
        <p v-else>
          {{ eventDetail?.privateScheduleLabel }}
        </p>
      </div>
      <!-- 登録者 -->
      <div v-if="!isEditable && eventDetail" class="flex flex-col gap-1">
        <Label>登録者</Label>
        <p>{{ eventDetail.createUserName }}</p>
      </div>
    </div>
    <!-- actions -->
    <div class="flex justify-between gap-2 p-4 pt-2">
      <template v-if="isEditable">
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
            @click="onConfirmDeleteTask"
          >
            削除
          </button>
        </div>
        <div class="flex gap-2">
          <button
            v-if="isEditMode"
            type="button"
            class="btn btn-text-primary min-w-btn"
            @click="duplicateEvent"
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
      </template>
      <button
        v-else
        type="button"
        class="btn btn-text mx-auto min-w-btn"
        @click="setClose();"
      >
        キャンセル
      </button>
    </div>
  </Form>
</template>
