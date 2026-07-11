<script setup lang="ts" generic="T">
type ValueAdapter<T> = keyof T | ((item: T) => T[keyof T] | T)
type LabelAdapter<T> = keyof T | ((item: T) => string)

const props = withDefaults(defineProps<{
  title?: string
  items: T[]
  valueAdapter?: ValueAdapter<T>
  labelAdapter?: LabelAdapter<T>
  checkDisable?: (item: T) => boolean
  initialItem?: T[]
}>(), {
  title: '選択',
  labelAdapter: 'label' as keyof T,
  valueAdapter: 'value' as keyof T,
  checkDisable: () => false,
  initialItem: () => [],
})

const emit = defineEmits<{
  afterLeave: []
  close: [value?: T[]]
}>()

function getValue(item: T) {
  if (typeof props.valueAdapter === 'string') {
    return item[props.valueAdapter as keyof T]
  }
  if (typeof props.valueAdapter === 'function') {
    return props.valueAdapter(item)
  }
  return item
}
function getLabel(item: T): string {
  if (typeof props.labelAdapter === 'string') {
    return item[props.labelAdapter as keyof T] as string
  }
  if (typeof props.labelAdapter === 'function') {
    return props.labelAdapter(item)
  }
  return item as string
}

const {
  selectedItems,
  isAllSelected,
  canSelectAllItems,
  hasSelectedItem,
  toggleSelectAll,
  isItemChecked,
  selectItem,
  removeSelectedItem,
  clearSelectedItems,
} = useCheckbox({
  items: toRef(() => props.items),
  initialItem: props.initialItem,
  canSelectItemFn: item => !props.checkDisable(item),
})
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    :title="title"
    :pt="{ panel: { class: 'sm:max-w-md sm:w-full' } }"
    persistent
    @after-leave="$emit('afterLeave')"
  >
    <div class="relative flex flex-col">
      <!-- content -->
      <div class="space-y-4 overflow-auto py-4">
        <Tabs class="flex-1" value="1">
          <TabList class="flex gap-1 px-4">
            <TabIndicator fluid class="h-full rounded-lg bg-primary/10" />
            <Tab class="rounded-lg" value="1">
              Tab 1
            </Tab>
            <Tab class="rounded-lg" value="2">
              <span>Tab 2</span>
              <Badge severity="info" class="translate-x-1/4">
                {{ selectedItems.length }}
              </Badge>
            </Tab>
          </TabList>
          <TabPanels keep-alive class="mt-4">
            <TabPanel value="1" class="flex flex-col gap-4">
              <div class="px-4">
                <input class="inputtext" type="text" placeholder="Search...">
              </div>
              <div class="flex items-center justify-between px-4">
                <p>表示中 {{ items.length }} 名</p>
                <p class="flex items-stretch gap-2">
                  <span class="self-center">{{ selectedItems.length }} 件 選択中</span>
                  <Checkbox
                    label="すべて選択" :indeterminate="hasSelectedItem && !isAllSelected"
                    :label-props="{ class: 'items-center!' }"
                    :model-value="isAllSelected"
                    :disabled="!canSelectAllItems"
                    @change="toggleSelectAll"
                  />
                  <button class="btn invisible px-0!" disabled aria-hidden>
                    &nbsp;
                  </button>
                </p>
              </div>
              <!-- list -->
              <div class="overflow-auto">
                <ul class="flex h-80 flex-col gap-1 px-4">
                  <li
                    v-for="(i, index) in items" :key="index"
                    :data-selected="isItemChecked(i) ? '' : undefined"
                    :data-disabled="checkDisable(i) ? '' : undefined"
                    class="flex cursor-pointer items-center gap-2 rounded-xl p-2 transition hover:bg-elevated/60 data-disabled:pointer-events-none data-disabled:opacity-50 data-selected:bg-elevated"
                    @click="!checkDisable(i) && selectItem(i)"
                  >
                    <Avatar class="size-10!" :text="getLabel(i)" />
                    <div class="flex flex-1 flex-col gap-1 select-none">
                      <p class="">
                        {{ getLabel(i) }}
                      </p>
                      <p class="text-xs text-muted">
                        ユーザ {{ getValue(i) }} のメールアドレス
                      </p>
                    </div>
                    <Icon v-if="isItemChecked(i)" class="text-primary" size="30" name="ph:check-circle-fill" />
                    <Icon v-else size="30" name="ph:plus-circle" />
                  </li>
                </ul>
              </div>
            </TabPanel>
            <TabPanel value="2" class="flex flex-col gap-4">
              <div class="px-4">
                <input class="inputtext" type="text" placeholder="Search...">
              </div>
              <div class="flex items-center justify-between px-4">
                <p>表示済み {{ selectedItems.length }} 名</p>
                <button
                  class="btn btn-outline-error gap-1 rounded-full!"
                  :disabled="!hasSelectedItem"
                  @click="clearSelectedItems()"
                >
                  <Icon class="-translate-x-1/4" name="ph:x-bold" />
                  <span>全削除</span>
                </button>
              </div>
              <!-- list -->
              <div class="overflow-auto">
                <ul class="flex h-80 flex-col gap-1 px-4">
                  <li
                    v-for="(i, index) in selectedItems" :key="index"
                    class="flex cursor-pointer items-center gap-2 rounded-xl p-2 transition hover:bg-elevated/60 data-disabled:pointer-events-none data-disabled:opacity-50"
                    :data-disabled="checkDisable(i) ? '' : undefined"
                    @click="!checkDisable(i) && removeSelectedItem(i)"
                  >
                    <Avatar class="size-10!" :text="getLabel(i)" />
                    <div class="flex flex-1 flex-col gap-1 select-none">
                      <p class="">
                        {{ getLabel(i) }}
                      </p>
                      <p class="text-xs text-muted">
                        ユーザ {{ getValue(i) }} のメールアドレス
                      </p>
                    </div>
                    <button class="btn btn-text-error gap-1 rounded-full!">
                      <Icon class="-translate-x-1/4" name="ph:x-bold" />
                      <span>削除</span>
                    </button>
                  </li>
                </ul>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
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
        </div>
        <Button
          class="btn-primary min-w-btn"
          @click="setClose(); $emit('close', selectedItems)"
        >
          設定
        </Button>
      </div>
    </div>
  </Dialog>
</template>
