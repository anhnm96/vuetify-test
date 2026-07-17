<script setup lang="ts">
import Dialog from '~/components/common/dialog/Dialog.vue'

const props = withDefaults(defineProps<{ value?: string }>(), { value: '03' })

defineEmits<{
  close: [value?: string]
  afterLeave: []
}>()

const res = ref(props.value)
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    title="出欠を回答"
    :pt="{
      panel: {
        role: 'alertdialog',
        class: 'w-full sm:max-w-xs',
        style: { '--severity': `var(--color-blue-500)`,
                 '--severity-light': `var(--color-blue-100)` },
      },
    }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- main -->
    <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
      <div class="flex items-center justify-between">
        <Radio v-model="res" label="未定" value="03" name="attendanceCd" />
        <Radio v-model="res" label="出席" value="01" name="attendanceCd" />
        <Radio v-model="res" label="欠席" value="02" name="attendanceCd" />
      </div>
    </div>
    <!-- action -->
    <div class="flex flex-col-reverse gap-3 bg-abg px-4 py-3 sm:flex-row-reverse sm:px-6">
      <button
        type="button"
        class="btn btn-outline w-full px-4 text-sm shadow-sm"
        @click="setClose();$emit('close')"
      >
        キャンセル
      </button>
      <button
        type="button"
        class="btn btn-outline w-full px-4 text-sm shadow-sm"
        @click="setClose();$emit('close', res)"
      >
        更新
      </button>
    </div>
  </Dialog>
</template>
