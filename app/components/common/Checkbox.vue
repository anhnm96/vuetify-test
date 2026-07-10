<script lang="ts" setup>
import type { LabelHTMLAttributes } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    labelProps?: LabelHTMLAttributes
    label?: string
    modelValue?: string | number | boolean | any[] | Set<any>
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
    <input v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox" class="shrink-0">
    <span v-if="label" class="leading-tight">{{ label }}</span>
    <template v-if="$slots.default"><slot /></template>
  </label>
  <input v-else v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox">
</template>

<style scoped>
label:has([type="checkbox"]) {
  cursor: pointer;
}

label:has([type="checkbox"]:disabled) {
  cursor: default;
  opacity: 0.7;
}

/* checkbox */
[type="checkbox"] {
  --min-size: 16px;
  --color: white;
  --background: var(--color-primary-500);
  --background-hover: hsla(0, 46%, 12%, 0.06);

  appearance: none;
  position: relative;
  display: inline-block;
  width: max(1em, var(--min-size));
  aspect-ratio: 1;
  cursor: pointer;
  color: var(--color);
  border: 1px solid var(--color-slate-200);
  border-radius: 0.25rem;
  outline: none;
  transition: background-color 200ms;

  &::before {
    content: '';
    position: absolute;
    inset: -0.75rem;
    border-radius: 50%;
    transition: background-color 200ms, opacity 200ms;

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

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: currentColor;
    opacity: 0;
    margin: 0.125rem;
    transition: clip-path .3s .1s, opacity .1s .1s, rotate .3s .1s, translate .3s .1s;
    rotate: 45deg;
    clip-path: polygon(20% 100%, 20% 80%, 50% 80%, 50% 80%, 70% 80%, 70% 100%);
  }

  &:checked,
  &:indeterminate {
    background-color: var(--background);
    border-color: var(--background);
  }

  &:checked::after {
    opacity: 1;
    clip-path: polygon(20% 100%, 20% 80%, 50% 80%, 50% 0%, 70% 0%, 70% 100%);
  }

  &:indeterminate::after {
    opacity: 1;
    clip-path: polygon(20% 100%, 20% 80%, 50% 80%, 50% 80%, 80% 80%, 80% 100%);
    translate: 0 -35%;
    rotate: none;
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
  input[type='checkbox'] {
    appearance: auto;
  }
}
</style>
