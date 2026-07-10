<script lang="ts">
import type { AlertDialogProps } from './AlertDialog.vue'
import Dialog from '~/components/common/dialog/Dialog.vue'
import DialogDescription from '~/components/common/dialog/DialogDescription.vue'
import DialogTitle from '~/components/common/dialog/DialogTitle.vue'

export interface ConfirmDialogProps {
  title?: string
  description?: string | string[]
  confirmLabel?: string
  severity?: Severity
  cancelLabel?: string
  content?: {
    prefix?: string
    main: string
  }
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  severity: 'info',
  title: 'Confirm',
  description: 'Are you sure to do this?',
})
defineEmits<{
  close: [value?: boolean]
  afterLeave: []
}>()

const getVariant = computed(() => {
  switch (props.severity) {
    case 'success':
      return { icon: 'ph:check-circle-bold', color: 'green' }
    case 'error':
      return { icon: 'ph:warning-bold', color: 'red' }
    case 'warn':
      return { icon: 'ph:warning-bold', color: 'orange' }
    default:
      return { icon: 'ph:info-bold', color: 'blue' }
  }
})
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    :pt="{
      panel: {
        role: 'alertdialog',
        class: 'w-full sm:max-w-xl ',
        style: { '--severity': `var(--color-${getVariant.color}-500)`,
                 '--severity-light': `var(--color-${getVariant.color}-100)` },
      },
    }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- main -->
    <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
      <!-- close button -->
      <div class="float-end -mt-2.5 -mr-2.5 hidden sm:block">
        <button
          type="button"
          class="btn btn-icon btn-text rounded-full!"
          @click="setClose();$emit('close', false)"
        >
          <span class="sr-only">Close</span>
          <Icon class="text-xl" name="ph:x-bold" />
        </button>
      </div>
      <div class="sm:flex sm:items-start">
        <!-- icon -->
        <div class="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-(--severity-light) sm:mx-0 sm:size-10">
          <Icon class="text-2xl text-(--severity)" :name="getVariant.icon" />
        </div>
        <div class="mt-3 grow text-center sm:mt-0 sm:ml-4 sm:text-left">
          <!-- title -->
          <DialogTitle class="text-bold text-lg leading-6 font-semibold">
            {{ title }}
          </DialogTitle>
          <!-- description -->
          <div class="mt-2 max-h-[40vh] overflow-auto outline-offset-2">
            <DialogDescription class="text-sm break-all whitespace-pre-line">
              <!-- array description -->
              <div v-if="Array.isArray(description)" class="space-y-0.5">
                <p v-for="(item, index) in description" :key="index" class="">
                  {{ item }}
                </p>
              </div>
              <!-- string description -->
              <div v-else class="">
                {{ description }}
              </div>
              <!-- detail content -->
              <div v-if="content" class="mt-2 rounded-xl bg-elevated/60 p-3">
                <span v-if="content.prefix">{{ content.prefix }} </span><span class="text-bold font-medium">{{ content.main }}</span>
              </div>
            </DialogDescription>
          </div>
        </div>
      </div>
    </div>
    <!-- action -->
    <div class="flex flex-col-reverse gap-3 bg-abg px-4 py-3 sm:flex-row-reverse sm:px-6">
      <button
        type="button"
        class="btn btn-outline w-full min-w-20 px-4 text-sm sm:w-auto"
        @click="setClose();$emit('close', false)"
      >
        {{ cancelLabel || 'いいえ' }}
      </button>
      <button
        type="button"
        class="btn w-full min-w-20 px-4 text-sm sm:w-auto"
        :class="[`btn-${severity}`]"
        @click="setClose();$emit('close', true)"
      >
        {{ confirmLabel || 'はい' }}
      </button>
    </div>
  </Dialog>
</template>
