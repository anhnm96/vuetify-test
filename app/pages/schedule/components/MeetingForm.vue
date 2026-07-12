<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem, MeetingFormValues, UpsertMeetingSchedulePayload } from '@/types/schedule'
import dayjs from 'dayjs/esm'
import QuickPickDialog from '~/components/common/QuickPickDialog.vue'
import UserSelectModal from '~/components/common/UserSelectModal.vue'
import { coloredIcons, icons, SCHEDULE_CODE_LABEL_MAP, SCHEDULE_TYPE_LIST, textColors } from '~/constants/schedule'
import { getEquipmentList, getEventDetail, getInviteeList, upsertMeetingSchedule } from '~/services/schedule'
import ReplyListDialog from './ReplyListDialog.vue'
import SearchFreeTimeDialog from './SearchFreeTimeDialog.vue'

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

const formId = useId()
const formRef = useTemplateRef('formRef')
const startDate = formatDateTime(props.startTimestamp)
const endDate = props.endTimestamp ? formatDateTime(props.endTimestamp) : startDate
const endTime = props.startTimestamp !== props.endTimestamp ? dayjs(props.endTimestamp).format('HH:mm') : dayjs(props.startTimestamp).add(30, 'minute').format('HH:mm')
const currentUserId = ref<number>()

const scheduleSchema = {
  scheduleTitle: 'required',
  startDate: 'required',
  startTime: 'required',
  endDate: 'required',
  endTime: 'required',
}

/** Map a fetched event onto the form model. Shared by the initial values (edit
 * mode) and the detail refetch so the event→form mapping lives in one place. */
function eventToFormValues(event: DetailPersonalScheduleEvent): MeetingFormValues {
  const [startDate, startTimeRaw] = event.startDateString.split(' ') as [string, string]
  const [endDate, endTimeRaw] = event.endDateString.split(' ') as [string, string]
  return {
    scheduleCd: event.scheduleCd,
    scheduleTitle: event.scheduleTitle,
    alldayFlg: event.alldayFlg,
    startDate,
    // hh:mm:ss -> hhmm
    startTime: startTimeRaw.replace(':', '').slice(0, 4),
    endDate,
    endTime: endTimeRaw.replace(':', '').slice(0, 4),
    scheduleLocation: event.scheduleLocation,
    details: event.details,
    urlLink: event.urlLink ?? undefined,
    scheduleIconCd: event.scheduleIconCd,
    scheduleColor: event.scheduleColor ?? '000000',
    scheduleId: event.scheduleId,
    notificationCd1: event.notificationCd1 ?? '01',
    notificationTime1: event.notificationTime1 ?? 0,
    notificationTimeUnit1: event.notificationTimeUnit1 ?? 1,
    notificationCd2: event.notificationCd2 ?? '01',
    notificationTime2: event.notificationTime2 ?? 0,
    notificationTimeUnit2: event.notificationTimeUnit2 ?? 1,
    editable: event.editable,
    equipments: event.meeting?.equipment ?? [],
    invitees: event.meeting?.invitees ?? [],
    attendanceCd: event.meeting?.attendanceCd,
    attendanceName: event.meeting?.attendanceName,
    ownerUserId: event.meeting?.ownerUserId,
  }
}

/** Map the form model to the API payload. The single typed boundary between the
 * form and `upsertMeetingSchedule` — no `omit`, no cast. */
function meetingFormToPayload(v: MeetingFormValues): UpsertMeetingSchedulePayload {
  return {
    scheduleId: v.scheduleId,
    scheduleTitle: v.scheduleTitle,
    start: `${v.startDate} ${v.startTime.slice(0, 2)}:${v.startTime.slice(2)}`,
    end: `${v.endDate} ${v.endTime.slice(0, 2)}:${v.endTime.slice(2)}`,
    scheduleLocation: v.scheduleLocation,
    details: v.details,
    urlLink: v.urlLink,
    equipmentIds: v.equipments?.map(e => e.userId),
    inviteeUserIds: (v.invitees ?? []).map(e => e.userId),
    scheduleIconCd: v.scheduleIconCd,
    scheduleColor: v.scheduleColor,
    notificationCd1: v.notificationCd1,
    notificationTime1: v.notificationTime1,
    notificationTimeUnit1: v.notificationTimeUnit1,
    notificationCd2: v.notificationCd2,
    notificationTime2: v.notificationTime2,
    notificationTimeUnit2: v.notificationTimeUnit2,
  }
}

const initialValues = reactive<MeetingFormValues>({
  scheduleTitle: '無題の予定',
  equipments: [],
  invitees: [],
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
})
if (props.event) {
  Object.assign(initialValues, eventToFormValues(props.event))
}

const { refresh: refreshSchedule, status: fetchScheduleStatus } = useAsyncData(
  `schedule/${props.event?.scheduleId}`,
  () => getEventDetail('meeting'),
  { immediate: isEditMode, transform: (data) => {
    try {
      formRef.value?.setValues({
        ...initialValues,
        ...eventToFormValues(data),
      })
      return data
    } catch (err) {
      console.error('Failed to transform schedule data', err)
      return null
    }
  } },
)

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

async function submitForm(values: any) {
  try {
    await upsertMeetingSchedule(meetingFormToPayload(values))
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

const showEquipmentsSelectDialog = ref(false)
async function onOpenSelectEquimentsDialog() {
  showEquipmentsSelectDialog.value = true
}

const items = [
  { label: 'Option 1', value: 1 },
  { label: 'Option 2', value: 2 },
  { label: 'Option 3', value: 3 },
  { label: 'Option 4', value: 4 },
  { label: 'Option 5', value: 5 },
  { label: 'Option 6', value: 6 },
  { label: 'Option 7', value: 7 },
  { label: 'Option 8', value: 8 },
  { label: 'Option 9', value: 9 },
  { label: 'Option 10', value: 10 },
  { label: 'Option 11', value: 11 },
  { label: 'Option 12', value: 12 },
  { label: 'Option 13', value: 13 },
]
async function openQuickPickDialog() {
  const res = await dialogStore.showDialog({
    component: markRaw(QuickPickDialog),
    props: {
      items,
      checkDisable: (item: any) => item.value === 3 || item.value === 4 || item.value === 5, // Example disable logic
      initialItem: [items[0], items[1], items[2]], // Example initial selected items
    },
  })
  console.log('🔍 ~ openQuickPickDialog ~ res:', res)
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
  formRef.value?.setFieldValue('startTime', `${res.startTime.slice(0, 2)}:${res.startTime.slice(2)}`)
  formRef.value?.setFieldValue('endDate', res.endDate)
  formRef.value?.setFieldValue('endTime', `${res.endTime.slice(0, 2)}:${res.endTime.slice(2)}`)
}

function onOpenReplyList() {
  dialogStore.showDialog({
    component: markRaw(ReplyListDialog),
    props: {
      scheduleId: formRef.value!.values.scheduleId,
    },
  })
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
      <!-- 設備 -->
      <div class="flex flex-col gap-1">
        <Label :for="`equipments__${formId}`">設備</Label>
        <div class="flex gap-4">
          <Button
            type="button" class="btn-outline"
            :loading="pendingGetEquipmentList"
            :disabled="getEquipmentListError"
            @click="onOpenSelectEquimentsDialog"
          >
            設備を選択
          </Button>
          <button type="button" @click="openQuickPickDialog">
            Open quick pick
          </button>
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
        <div class="flex gap-4">
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
          <div class="flex flex-col gap-1">
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
          <!-- 設備・招待するユーザの空き時間を選択 -->
          <button
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
        <v-chip
          size="small"
          class="w-fit"
          :class="[form.values.attendanceCd === '01' ? 'bg-primary!'
            : form.values.attendanceCd === '02' && 'bg-red-500!']"
        >
          {{ form.values.attendanceName }}
        </v-chip>
        <button
          type="button" class="btn btn-outline mt-1 w-fit"
          @click="onOpenReplyList"
        >
          回答一覧を表示
        </button>
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
        <!-- line 2 -->
        <div class="flex gap-2">
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
