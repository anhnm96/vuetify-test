<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem, UpsertMeetingSchedulePayload } from '@/types/schedule'
import dayjs from 'dayjs/esm'
import { omit } from 'lodash-es'
import UserSelectModal from '~/components/common/UserSelectModal.vue'
import { ATTENDANCE_CODE_LABEL_MAP, coloredIcons, icons, SCHEDULE_CODE_LABEL_MAP, SCHEDULE_TYPE_LIST, textColors } from '~/constants/schedule'
import { deleteSchedule, getEquipmentList, getEventDetail, getInviteeList, replyMeetingAttendance, upsertMeetingSchedule } from '~/services/schedule'
import AttendanceReplyDialog from './AttendanceReplyDialog.vue'
import ReplyListDialog from './ReplyListDialog.vue'
import SearchFreeTimeDialog from './SearchFreeTimeDialog.vue'

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

const formId = useId()
const formRef = useTemplateRef('formRef')
const startDate = props.simpleForm?.startDate ?? formatDateTime(props.startTimestamp)
const endDate = props.simpleForm?.endDate ?? (props.endTimestamp ? formatDateTime(props.endTimestamp) : startDate)
const endTime = props.simpleForm?.endTime ?? (props.startTimestamp !== props.endTimestamp ? dayjs(props.endTimestamp).format('HHmm') : dayjs(props.startTimestamp).add(30, 'minute').format('HHmm'))
const currentUserId = ref<number>()

const scheduleSchema = {
  scheduleTitle: 'required',
  startDate: 'required',
  startTime: 'required',
  endDate: 'required',
  endTime: 'required',
  urlLink: 'optional_url',
}

const initialValues = reactive({
  scheduleTitle: props.simpleForm?.scheduleTitle ?? '無題の予定',
  equipments: [],
  invitees: [],
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
  })
}

const { data: eventDetail, refresh: refreshSchedule, status: fetchScheduleStatus } = useAsyncData(
  `schedule/${props.event?.scheduleId}`,
  () => getEventDetail('meeting'),
  { immediate: isEditMode, transform: (res) => {
    try {
      const data = res
      let [startDate, startTime] = data.startDateString.split(' ') as [string, string]
      let [endDate, endTime] = data.endDateString.split(' ') as [string, string]
      // hh:mm:ss -> hhmm
      startTime = startTime.replace(':', '').slice(0, 4)
      endTime = endTime.replace(':', '').slice(0, 4)
      formRef.value?.setValues({
        ...initialValues,
        ...{
          scheduleTitle: data.scheduleTitle,
          alldayFlg: data.alldayFlg,
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
          editable: data.editable,
          meeting: data.meeting,
          attendanceCd: data.meeting?.attendanceCd,
          attendanceName: data.meeting?.attendanceName,
          equipments: data.meeting?.equipment,
          invitees: data.meeting?.invitees,
          ownerUserId: data.meeting?.ownerUserId,
        },
      })
      return data
    } catch (err) {
      console.error('Failed to transform schedule data', err)
      return null
    }
  } },
)

const isEditable = computed(() => !isEditMode || (isEditMode && formRef.value?.values.editable))
const scheduleIcon = computed(() => {
  if (isEditable.value) return
  return icons.find(i => i.code === formRef.value?.values.scheduleIconCd)
})
const scheduleColoredIcon = computed(() => {
  if (isEditable.value) return
  return coloredIcons.find(i => i.code === formRef.value?.values.scheduleIconCd)
})

const { data: equipmentList, pending: pendingGetEquipmentList, error: getEquipmentListError, refresh: fetchEquipmentList } = useAsyncData('equiment-list', () => getEquipmentList(), {
  transform: res => res.list,
})

const { data: groupList, pending: pendingGetGroupList, error: getGroupListError, refresh: fetchGroupList } = useAsyncData(() => getInviteeList(), {
  transform: (res) => {
    if (!isEditMode)
      formRef.value?.setFieldValue('invitees', [res.user])
    currentUserId.value = (res.user as any)?.userId
    return res.list
  },
})

async function duplicateMeeting() {
  if (!formRef.value) return
  const res = await formRef.value.validate()
  if (!res.valid) return
  const values = formRef.value.values
  try {
    // 複製なので既存の scheduleId は含めない（新規作成として扱う）
    // Là bản sao nên không gửi scheduleId (xử lý như tạo mới)
    const payload = omit(values, [
      'scheduleId',
      'startDate',
      'startTime',
      'endDate',
      'endTime',
      'editable',
      'meeting',
      'equipments',
      'invitees',
      'attendanceCd',
      'attendanceName',
      'ownerUserId',
    ])

    payload.start = `${values.startDate} ${values.startTime.slice(0, 2)}:${values.startTime.slice(2)}`
    payload.end = `${values.endDate} ${values.endTime.slice(0, 2)}:${values.endTime.slice(2)}`
    if (values.equipments) {
      payload.equipmentIds = values.equipments.map((e: UserOption) => e.userId)
    }
    payload.inviteeUserIds = values.invitees.map((e: UserOption) => e.userId)
    await upsertMeetingSchedule(payload as UpsertMeetingSchedulePayload)
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
    const payload = omit<UpsertMeetingSchedulePayload>(values, [
      'startDate',
      'startTime',
      'endDate',
      'endTime',
      'editable',
      'meeting',
      'equipments',
      'invitees',
      'attendanceCd',
      'attendanceName',
      'ownerUserId',
    ])

    payload.start = `${values.startDate} ${values.startTime.slice(0, 2)}:${values.startTime.slice(2)}`
    payload.end = `${values.endDate} ${values.endTime.slice(0, 2)}:${values.endTime.slice(2)}`
    if (values.equipments) {
      payload.equipmentIds = values.equipments.map((e: UserOption) => e.userId)
    }
    payload.inviteeUserIds = values.invitees.map((e: UserOption) => e.userId)
    await upsertMeetingSchedule(payload as UpsertMeetingSchedulePayload)
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
  const basicFieldNamesOrder = ['scheduleTitle', 'startDate', 'startTime', 'endDate', 'endTime']
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

watch([() => formRef.value?.values.endDate, () => formRef.value?.values.endTime], ([newDate, newTime]) => {
  if (!newDate || !newTime) return
  const startDate = formRef.value?.values.startDate
  const startTime = formRef.value?.values.startTime
  if (!startDate || !startTime) return
  // 終了日時が開始日時より前になったら開始日時を終了日時に合わせる
  // Nếu ngày giờ kết thúc sớm hơn ngày giờ bắt đầu thì kéo bắt đầu về bằng kết thúc
  const res = compareDates(`${newDate} ${newTime.slice(0, 2)}:${newTime.slice(2)}`, `${startDate} ${startTime.slice(0, 2)}:${startTime.slice(2)}`)
  if (res === -1) {
    // 開始日時を終了日時の30分前に設定する
    // Đặt ngày giờ bắt đầu sớm hơn ngày giờ kết thúc mới 30 phút
    const newStart = dayjs(`${newDate} ${newTime.slice(0, 2)}:${newTime.slice(2)}`).subtract(30, 'minute')
    formRef.value?.setFieldValue('startDate', newStart.format('YYYY-MM-DD'))
    formRef.value?.setFieldValue('startTime', newStart.format('HHmm'))
  }
})

watch([() => formRef.value?.values.startDate, () => formRef.value?.values.startTime], ([newDate, newTime]) => {
  if (!newDate || !newTime) return
  const endDate = formRef.value?.values.endDate
  const endTime = formRef.value?.values.endTime
  if (!endDate || !endTime) return
  // 開始日時が終了日時より後になったら終了日時を開始日時に合わせる
  // Nếu ngày giờ bắt đầu muộn hơn ngày giờ kết thúc thì kéo kết thúc về bằng bắt đầu
  const res = compareDates(`${newDate} ${newTime.slice(0, 2)}:${newTime.slice(2)}`, `${endDate} ${endTime.slice(0, 2)}:${endTime.slice(2)}`)
  if (res === 1) {
    // 終了日時を開始日時の30分後に設定する
    // Đặt ngày giờ kết thúc muộn hơn ngày giờ bắt đầu mới 30 phút
    const newEnd = dayjs(`${newDate} ${newTime.slice(0, 2)}:${newTime.slice(2)}`).add(30, 'minute')
    formRef.value?.setFieldValue('endDate', newEnd.format('YYYY-MM-DD'))
    formRef.value?.setFieldValue('endTime', newEnd.format('HHmm'))
  }
})

const showEquipmentsSelectDialog = ref(false)
async function onOpenSelectEquimentsDialog() {
  showEquipmentsSelectDialog.value = true
}

const showUsersSelectDialog = ref(false)
function onOpenSelectUsersDialog() {
  showUsersSelectDialog.value = true
}

async function onOpenSelectTimeDialog() {
  const res = await dialogStore.showDialog({
    component: markRaw(SearchFreeTimeDialog),
    props: {
      startDate: formRef.value!.values.startDate,
      startTime: formRef.value!.values.startTime,
      users: [...formRef.value!.values.equipments, ...formRef.value!.values.invitees],
    },
  })
  if (!res) return
  formRef.value?.setFieldValue('startDate', res.startDate)
  formRef.value?.setFieldValue('startTime', res.startTime.replace(':', ''))
  formRef.value?.setFieldValue('endDate', res.endDate)
  formRef.value?.setFieldValue('endTime', res.endTime.replace(':', ''))
}

function onOpenReplyList() {
  dialogStore.showDialog({
    component: markRaw(ReplyListDialog),
    props: {
      scheduleId: formRef.value!.values.scheduleId,
    },
  })
}

async function onOpenAttendanceReply() {
  const res = await dialogStore.showDialog({
    component: markRaw(AttendanceReplyDialog),
    props: {
      value: formRef.value!.values.meeting.attendanceCd,
    },
  })
  if (!res) return
  try {
    await replyMeetingAttendance({
      scheduleId: formRef.value?.values.scheduleId,
      attendanceCd: res,
    })
    formRef.value?.setFieldValue('attendanceCd', res)
    formRef.value?.setFieldValue('attendanceName', ATTENDANCE_CODE_LABEL_MAP[res])
    toast.show({ title: `回答を保存しました。`, severity: 'success' })
  } catch (err) {
    console.error(err)
    toast.show({ title: '回答の処理に失敗しました。', severity: 'error' })
  }
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
async function onConfirmDelete() {
  const res = await dialogStore.showConfirm({
    title: '削除',
    description: '削除します。よろしいですか？',
    severity: 'error',
  })
  if (!res) return
  try {
    isDeleting.value = true
    await deleteSchedule({ scheduleId: formRef.value!.values.scheduleId })
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
    <UserSelectModal
      v-if="showEquipmentsSelectDialog"
      v-model:show="showEquipmentsSelectDialog"
      :model-value="form.values.equipments"
      title="設備選択" :users="equipmentList as any"
      @update:model-value="form.setFieldValue('equipments', $event)"
    />
    <UserSelectModal
      v-if="showUsersSelectDialog"
      v-model:show="showUsersSelectDialog"
      :model-value="form.values.invitees"
      title="ユーザー選択" :groups="groupList as any"
      :check-disable="(i: UserOption) => i.userId === currentUserId"
      @update:model-value="form.setFieldValue('invitees', $event)"
    />
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
      <!-- 設備 -->
      <div class="flex flex-col gap-1">
        <Label :for="`equipments__${formId}`">設備</Label>
        <div v-if="isEditable" class="flex gap-4">
          <Button
            type="button" class="btn-outline"
            :loading="pendingGetEquipmentList"
            :disabled="getEquipmentListError"
            @click="onOpenSelectEquimentsDialog"
          >
            設備を選択
          </Button>
          <div v-if="getEquipmentListError" class="flex items-center gap-1">
            <p>データの取得に失敗しました。</p>
            <button
              class="btn btn-link border-none! p-0!"
              @click="fetchEquipmentList()"
            >
              再読み込み
            </button>
          </div>
        </div>
        <div class="mt-1 flex flex-wrap gap-2">
          <v-chip v-for="e in form.values.equipments" :key="e.userId" variant="outlined">
            {{ e.userName }}
          </v-chip>
        </div>
      </div>
      <!-- 招待するユーザ -->
      <div class="flex flex-col gap-1">
        <Label :for="`userIds__${formId}`">招待するユーザー</Label>
        <div v-if="isEditable" class="flex gap-4">
          <Button
            type="button" class="btn-outline"
            :loading="pendingGetGroupList"
            :disabled="getGroupListError"
            @click="onOpenSelectUsersDialog"
          >
            ユーザーを選択
          </Button>
          <div v-if="getGroupListError" class="flex items-center gap-1">
            <p>データの取得に失敗しました。</p>
            <button
              class="btn btn-link border-none! p-0!"
              @click="fetchGroupList()"
            >
              再読み込み
            </button>
          </div>
        </div>
        <div class="mt-1 flex flex-wrap gap-2">
          <v-chip v-for="e in form.values.invitees" :key="e.userId" variant="outlined">
            {{ e.userName }}
          </v-chip>
        </div>
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
          <div class="flex flex-col gap-1">
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
          <div class="flex flex-col gap-1">
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
          <!-- 設備・招待するユーザの空き時間を選択 -->
          <button
            v-if="isEditable"
            type="button" class="btn btn-outline"
            @click="onOpenSelectTimeDialog"
          >
            設備・招待するユーザの空き時間を選択
          </button>
        </div>
      </div>
      <!-- 出欠 -->
      <div v-if="isEditMode" class="flex flex-col gap-1">
        <Label>出欠</Label>
        <Badge
          v-if="isEditMode"
          :severity="form.values.attendanceCd === '01' ? 'info'
            : form.values.attendanceCd === '02' ? 'error' : ''"
          class="w-fit min-w-11 justify-center"
        >
          {{ form.values.attendanceName }}
        </Badge>
        <div class="mt-1 flex gap-2">
          <button
            v-if="isEditMode && eventDetail?.meeting?.attendanceEnable"
            type="button" class="btn btn-outline w-fit"
            @click="onOpenAttendanceReply"
          >
            出欠を回答
          </button>
          <button
            type="button" class="btn btn-outline w-fit"
            @click="onOpenReplyList"
          >
            回答一覧を表示
          </button>
        </div>
      </div>
      <!-- カレンダー -->
      <div v-if="isEditMode && !eventDetail?.meeting?.attendanceEnable" class="flex flex-col gap-1">
        <Label>カレンダー</Label>
        <p>{{ eventDetail?.calendarName }}</p>
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
            @click="onConfirmDelete"
          >
            削除
          </button>
        </div>
        <div class="flex gap-2">
          <button
            v-if="isEditMode"
            type="button"
            class="btn btn-text-primary min-w-btn"
            @click="duplicateMeeting"
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
