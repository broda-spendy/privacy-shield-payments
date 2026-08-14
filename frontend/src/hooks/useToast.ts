/**
 * useToast — Issue #48
 *
 * Hook to trigger toasts from anywhere in the component tree.
 * Requires the app to be wrapped in <ToastProvider> (see main.tsx).
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Deposit successful')
 *   toast.error('Transaction failed')
 *   toast.info('Processing…')
 */

import { useCallback } from 'react'
import {
  useToastContext,
  type ToastType,
} from '../components/Toast'

export interface UseToastReturn {
  /** Push a toast of the given type. */
  toast: (type: ToastType, message: string) => void
  /** Push a success toast (green). */
  success: (message: string) => void
  /** Push an error toast (red). */
  error: (message: string) => void
  /** Push an info toast (blue). */
  info: (message: string) => void
  /** Immediately remove a toast by id. */
  dismiss: (id: number) => void
  /** Remove every visible toast. */
  clear: () => void
}

export function useToast(): UseToastReturn {
  const { notify, dismiss, clear } = useToastContext()

  const success = useCallback((message: string) => notify('success', message), [notify])
  const error = useCallback((message: string) => notify('error', message), [notify])
  const info = useCallback((message: string) => notify('info', message), [notify])
  const toast = useCallback(
    (type: ToastType, message: string) => notify(type, message),
    [notify],
  )

  return { toast, success, error, info, dismiss, clear }
}

export default useToast
