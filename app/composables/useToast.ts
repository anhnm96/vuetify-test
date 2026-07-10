import type { ToastProps } from '~/components/common/CustomToast.vue'
import { toast } from 'vue-sonner'
import CustomToast from '~/components/common/CustomToast.vue'

interface ToastParams extends ToastProps {
  duration?: number
}

export function useToast() {
  function show({ duration, ...props }: ToastParams) {
    return toast.custom(markRaw(CustomToast), {
      componentProps: props,
      duration,
    })
  }

  return { instance: toast, show }
}
