<script lang="ts">
import Dialog from '~/components/common/dialog/Dialog.vue'
import DialogDescription from '~/components/common/dialog/DialogDescription.vue'
</script>

<script setup lang="ts">
defineEmits<{
  close: [value?: string]
  afterLeave: []
}>()
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    :pt="{
      panel: {
        role: 'alertdialog',
        class: 'w-full px-4 pb-4 pt-5 sm:min-w-sm sm:max-w-xl sm:w-auto sm:p-6',
        style: { '--severity': `var(--color-blue-500)`,
                 '--severity-light': `var(--color-blue-100)` },
      },
    }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- main -->
    <div>
      <!-- icon -->
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--severity-light)">
        <Icon class="text-2xl text-(--severity)" name="ph:info-bold" />
      </div>
      <div class="mt-3 text-center sm:mt-5">
        <!-- description -->
        <div class="max-h-[40vh] overflow-auto px-4 outline-offset-2 sm:px-6">
          <DialogDescription class="text-sm break-all whitespace-pre-line">
            <p>繰り返しの予定を削除します。削除方法を選択してください。</p>
            <div class="mt-4 flex flex-col gap-4">
              <button class="btn btn-outline-primary" @click="setClose();$emit('close', '1')">
                この予定のみ変更
              </button>
              <button class="btn btn-outline-primary" @click="setClose();$emit('close', '2')">
                これ以降の予定を変更
              </button>
              <button class="btn btn-outline-primary" @click="setClose();$emit('close', '3')">
                全ての予定を変更
              </button>
            </div>
          </DialogDescription>
        </div>
      </div>
    </div>
    <!-- action -->
    <div class="mt-5 px-4 sm:mt-6 sm:px-6">
      <button
        type="button"
        class="btn btn-outline w-full px-4 text-sm shadow-sm"
        @click="setClose();$emit('close')"
      >
        キャンセル
      </button>
    </div>
  </Dialog>
</template>
