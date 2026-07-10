<script setup lang="ts">
import type { DetailPersonalScheduleEvent, EditCalendarItem, UpsertTaskSchedulePayload } from '@/types/schedule'
import dayjs from 'dayjs/esm'
import { omit } from 'lodash-es'
import UserSelectModal from '~/components/common/UserSelectModal.vue'
import { SCHEDULE_CODE_LABEL_MAP, SCHEDULE_CODES, SCHEDULE_TYPE_LIST } from '~/constants/schedule'
import { deleteSchedule, deleteTaskSchedule, getEventDetail, getInviteeList, getTaskScheduleCategories, upsertTaskSchedule } from '~/services/schedule'

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
const limitDate = formatDateTime(props.startTimestamp)
const currentUserId = ref<number>()
const unlimited = ref(false)

const scheduleSchema = {
  todolistName: 'required',
}

const initialValues = reactive({
  groupId: 0,
  todolistName: '無題の予定',
  importanceDiv: 0,
  priorityDiv: 0,
  members: [],
  limitDate,
  limitTime: dayjs(props.startTimestamp).format('HH:mm'),
  complet: false,
})
if (props.event) {
  let [limitDate, limitTime] = props.event.startDateString.split(' ') as [string, string]
  // hh:mm:ss -> hhmm
  limitDate = limitTime.replace(':', '').slice(0, 4)

  Object.assign(initialValues, {
    scheduleCd: props.event.scheduleCd,
    groupId: props.event.groupId,
    todolistName: props.event.todolistName,
    todolistText: props.event.todolistText,
    importanceDiv: props.event.importanceDiv,
    priorityDiv: props.event.priorityDiv,
    limitDate,
    limitTime,
    scheduleId: props.event.scheduleId,
  })
}

const { refresh: refreshSchedule, status: fetchScheduleStatus } = useAsyncData(
  `schedule/${props.event?.scheduleId}`,
  () => getEventDetail(props.event?.scheduleId as number),
  { immediate: isEditMode, transform: (res) => {
    try {
      const data = res.data
      // hh:mm -> hhmm
      const limitTime = data.todo?.limitTime?.replace(':', '') ?? ''
      formRef.value?.setValues({
        ...initialValues,
        ...{
          groupId: data.todo?.groupId,
          todolistName: data.todo?.todolistName,
          todolistText: data.todo?.todolistText,
          importanceDiv: data.todo?.importanceDiv,
          priorityDiv: data.todo?.priorityDiv,
          limitDate: data.todo?.limitDate,
          limitTime,
          members: data.todo?.members,
          scheduleId: data.scheduleId,
          complet: data.todo?.complet,
          editable: data.editable,
          todo: data.todo,
          todoContentsId: data.todo?.todoListId,
        },
      })
      if (!data.todo?.limitDate) {
        unlimited.value = true
      }
      return data
    } catch (err) {
      console.error('Failed to transform schedule data', err)
      return null
    }
  } },
)

const { data: groupList, pending: pendingGetGroupList, error: getGroupListError, refresh: fetchGroupList } = useAsyncData(() => getInviteeList(), {
  transform: (res) => {
    // if (!isEditMode)
    formRef.value?.setFieldValue('members', [res.data.user])
    currentUserId.value = (res.data.user as any)?.userId
    return res.data.list
  },
})

const { data: categories, pending: pendingGetCategories, error: getCategoriesError, refresh: fetchCategories } = useAsyncData(() => getTaskScheduleCategories(), {
  transform: (res) => {
    return [{ groupId: 0, groupName: '-- 選択 --' }, ...res.data.list]
  },
})

async function submitForm(values: any) {
  try {
    // Process the validated form values
    const payload = omit(values, ['limitDate', 'limitTime', 'members', 'todo', 'editable'])

    if (!unlimited.value) {
      payload.limitDate = values.limitDate
      if (values.limitTime.length === 4)
        payload.limitTime = `${values.limitTime.slice(0, 2)}:${values.limitTime.slice(2)}`
    }
    payload.memberIds = values.members.map((e: UserOption) => e.userId)

    await upsertTaskSchedule(payload as UpsertTaskSchedulePayload)
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
  const basicFieldNamesOrder = ['todolistName']
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

const showUsersSelectDialog = ref(false)
function onOpenSelectUsersDialog() {
  showUsersSelectDialog.value = true
}

const PRIORITY_OPTIONS = [
  {
    label: 'なし',
    value: 0,
  },
  {
    label: '低',
    value: 25,
  },
  {
    label: '中',
    value: 50,
  },
  {
    label: '高',
    value: 75,
  },
  {
    label: '最優先',
    value: 100,
  },
]

const isDeleting = ref(false)
async function onConfirmDeleteTask() {
  const res = await dialogStore.showConfirm({ description: '削除します。よろしいですか？' })
  if (!res) return
  try {
    isDeleting.value = true
    // await deleteSchedule({ scheduleId: formRef.value!.values.scheduleId })
    await deleteTaskSchedule(formRef.value!.values.todoContentsId)
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
      v-if="showUsersSelectDialog"
      v-model:show="showUsersSelectDialog"
      :model-value="form.values.members"
      title="ユーザー選択" :groups="groupList as any"
      :check-disable="(i: UserOption) => i.userId === currentUserId"
      @update:model-value="form.setFieldValue('members', $event)"
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
      <!-- カテゴリ -->
      <div class="flex flex-col gap-1">
        <Label :for="`groupId__${formId}`">カテゴリ</Label>
        <v-select
          :id="`groupId__${formId}`"
          v-model="form.values.groupId"
          class="custom-input"
          label=""
          :items="categories"
          variant="outlined"
          item-title="groupName"
          item-value="groupId"
          hide-details
          :loading="pendingGetCategories"
        />
        <div v-if="getCategoriesError" class="flex items-center gap-1">
          <p>カテゴリの取得に失敗しました。</p>
          <button
            class="btn btn-link border-none! p-0!"
            @click="fetchCategories()"
          >
            再読み込み
          </button>
        </div>
      </div>
      <!-- タスク名 -->
      <div class="flex flex-col gap-1">
        <Label required :for="`todolistName__${formId}`">タスク名</Label>
        <Field
          :id="`todolistName__${formId}`"
          class="inputtext"
          :class="[form.errors.todolistName && 'invalid']"
          name="todolistName"
          label="タスク名"
          @input="form.setFieldError('name', '')"
        />
        <TransitionHeight :show="!!form.errors.todolistName">
          <ErrorMessage name="todolistName" class="text-error" />
        </TransitionHeight>
      </div>
      <!-- 詳細 -->
      <div class="flex flex-col gap-1">
        <Label :for="`todolistText__${formId}`">詳細</Label>
        <Field
          v-slot="{ field }"
          class="inputtext"
          name="todolistText"
        >
          <textarea
            :id="`todolistText__${formId}`"
            v-bind="field"
            class="textarea"
            rows="3"
            maxlength="1000"
          />
        </Field>
      </div>
      <!-- 重要マーク -->
      <div class="flex flex-col gap-1">
        <Label :for="`importanceDiv__${formId}`">重要マーク</Label>
        <div class="flex gap-2">
          <label
            class="inline-flex w-15 cursor-pointer flex-center rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
          >
            <span>なし</span>
            <Field name="importanceDiv" type="radio" class="hidden" :value="0" />
          </label>
          <label
            class="inline-flex w-15 cursor-pointer flex-center rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
          >
            <span>あり</span>
            <Field name="importanceDiv" type="radio" class="hidden" :value="100" />
          </label>
        </div>
      </div>
      <!-- 優先度 -->
      <div class="flex flex-col gap-1">
        <Label :for="`priorityDiv__${formId}`">優先度</Label>
        <div class="flex gap-2">
          <label
            v-for="item in PRIORITY_OPTIONS"
            :key="item.value"
            class="inline-flex w-15 cursor-pointer flex-center rounded-full p-1 transition hover:bg-surface-inverted/20 has-checked:bg-surface-inverted/30"
          >
            <span>{{ item.label }}</span>
            <Field name="priorityDiv" type="radio" class="hidden" :value="item.value" />
          </label>
        </div>
      </div>
      <!-- 期限 -->
      <div class="flex flex-col gap-1">
        <Label>期限</Label>
        <div class="flex items-center gap-2">
          <!-- limitDate -->
          <div class="flex flex-col gap-1">
            <Field
              v-slot="{ value, handleChange }"
              name="limitDate"
              label="期限"
            >
              <v-date-input
                :class="[form.errors.limitDate && 'invalid']"
                :model-value="value"
                hide-details autocomplete="off"
                input-format="yyyy-mm-dd"
                placeholder="年-月-日"
                class="custom-input h-9.5 w-46"
                label="" prepend-icon="" variant="outlined"
                :disabled="unlimited"
                @update:model-value="($event) => handleChange(formatDateTime($event), false)"
              />
            </Field>
          </div>
          <!-- limitTime -->
          <div class="flex flex-col gap-1">
            <Field
              v-slot="{ handleChange, value }"
              name="limitTime"
              label="日時"
            >
              <TimePicker
                :model-value="value" :class="[form.errors.limitTime && 'invalid']"
                :minute-step="15"
                :disabled="unlimited"
                @update:model-value="handleChange($event, false)"
              />
            </Field>
          </div>
          <!-- no deadline -->
          <Checkbox v-model="unlimited" label="期限なし" />
        </div>
      </div>
      <!-- 共有ユーザ -->
      <div class="flex flex-col gap-1">
        <Label :for="`members__${formId}`">共有ユーザー</Label>
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
          <v-chip v-for="e in form.values.members" :key="e.userId" variant="outlined">
            {{ e.userName }}
          </v-chip>
        </div>
      </div>
      <!-- タスクを完了にする -->
      <Field v-slot="{ handleChange, value }" name="complet" type="checkbox">
        <Checkbox
          :model-value="value" label="タスクを完了にする"
          :label-props="{ class: 'w-fit' }"
          @update:model-value="handleChange($event, false)"
        />
      </Field>
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
          @click="onConfirmDeleteTask"
        >
          削除
        </button>
      </div>
      <div class="flex gap-2">
        <button
          v-if="isEditMode && form.values.scheduleCd !== SCHEDULE_CODES.TODO"
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
