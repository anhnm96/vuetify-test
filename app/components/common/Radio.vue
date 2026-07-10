<script setup lang="ts">
import type { LabelHTMLAttributes } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    labelProps?: LabelHTMLAttributes
    label?: string
    modelValue?: string | number | boolean | any | Set<any>
  }>(),
  {
    modelValue: false,
  },
)

const emit = defineEmits(['update:modelValue'])
const value = useInternalValue(props, emit)

const inputRef = ref()
function focus() {
  // MacOS FireFox and Safari do not focus when clicked
  inputRef.value.focus()
}
</script>

<template>
  <label
    v-if="label || $slots.default" class="inline-flex items-start space-x-2"
    v-bind="labelProps"
    @click.stop="focus"
  >
    <input v-bind="$attrs" ref="inputRef" v-model="value" type="radio" class="shrink-0">
    <span v-if="label" class="leading-tight">{{ label }}</span>
    <template v-if="$slots.default"><slot /></template>
  </label>
  <input v-else v-bind="$attrs" ref="inputRef" v-model="value" type="radio">
</template>

<style scoped>
label:has([type="radio"]) {
  cursor: pointer;
}

label:has([type="radio"]:disabled) {
  cursor: default;
  opacity: 0.7;
}

input[type='radio'] {
  --min-size: 16px;
  --color: var(--color-primary-500);
  --border-color: var(--color-slate-200);
  --background-hover: hsla(0, 46%, 12%, 0.06);

  appearance: none;
  position: relative;
  height: max(1em, var(--min-size));
  width: max(1em, var(--min-size));
  border: 1px solid var(--border-color);
  border-radius: 3.40282e38px;
  cursor: pointer;
  vertical-align: middle;

  &::before {
    content: '';
    position: absolute;
    inset: -0.75rem;
    border-radius: 50%;
    transition: background-color 200ms;

    /* increase tap target size for touch devices */
    @media (pointer: coarse) {
      inset: -1.25rem;
      --background-hover: transparent;
    }
  }

  &:enabled:where(:hover, :focus-visible) {
    &::before {
      background-color: var(--background-hover);
    }

    &:active::before {
      --background-hover: hsla(0, 46%, 12%, 0.15);
    }
  }

  &:checked {
    border-color: var(--color);
  }

  &::after {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    border-radius: 3.40282e38px;
    transform: scale(0);
    transition: 120ms transform ease-in-out;
    background-color: var(--color);
  }

  &:checked::after {
    transform: scale(.6);
  }

  &:disabled {
    cursor: default;
    opacity: 0.7;
  }

  &:not(:checked):disabled {
    background-color: var(--color-slate-300);
  }
}

@media print {
  input[type='radio'] {
    appearance: auto;
  }
}
</style>
