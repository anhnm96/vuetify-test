import type { ComponentProps } from 'vue-component-type-helpers'
import type { DialogRootProps } from '~/components/common/dialog/Dialog.vue'
import AlertDialog from '~/components/base/dialogs/AlertDialog.vue'
import ConfirmDialog from '~/components/base/dialogs/ConfirmDialog.vue'

/**
 * The payload a dialog resolves with, i.e. the argument of its `close` emit.
 *
 * Vue exposes every declared emit as an individual `on<Event>` handler prop, so
 * we read it from the `onClose` prop rather than from the (overloaded) emit
 * function. Falls back to `void` when a component has no
 * `close` emit. e.g. `emit('close', value?: T)` -> `T | undefined`.
 */
type CloseEmitPayload<T extends Component>
  = ComponentProps<T> extends { onClose?: infer H }
    ? NonNullable<H> extends (...args: infer A) => any ? A[0] : void
    : void

export interface Dialog<T extends Component> {
  id?: string | number
  component: T
  // https://stackoverflow.com/questions/68602712/extracting-the-prop-types-of-a-component-in-vue-3-typescript-to-use-them-somew
  props?: ComponentProps<T> & DialogRootProps
  resolve: (value?: any) => void
}

export const useDialogStore = defineStore('dialog', () => {
  let id = 0
  const dialogs = ref<Dialog<Component>[]>([])

  function showDialog<T extends Component>(dialog: Omit<Dialog<T>, 'resolve'>) {
    return new Promise<CloseEmitPayload<T>>((resolve) => {
      dialogs.value.push({
        component: dialog.component,
        id: dialog.id || id++,
        resolve,
        props: Object.assign({ open: true }, dialog.props),
      })
    })
  }

  function closeDialog(id: string | number, value?: any) {
    const dialogIndex = dialogs.value.findIndex(dialog => dialog.id === id)
    if (dialogIndex > -1) {
      dialogs.value[dialogIndex]!.resolve?.(value)
      dialogs.value.splice(dialogIndex, 1)
    }
  }

  function showAlert(props: Dialog<typeof AlertDialog>['props']) {
    return showDialog({ component: markRaw(AlertDialog), props })
  }

  function showConfirm(props: Dialog<typeof ConfirmDialog>['props']) {
    return showDialog({ component: markRaw(ConfirmDialog), props })
  }

  return { dialogs, showDialog, closeDialog, showAlert, showConfirm }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDialogStore, import.meta.hot))
