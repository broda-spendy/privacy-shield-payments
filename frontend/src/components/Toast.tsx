/**
 * Toast — Issue #48
 *
 * Toast/notification system that shows success, error, and info messages
 * after wallet actions. Renders in a fixed stack in the bottom-right corner
 * and auto-dismisses each toast after 4 seconds.
 *
 * The <ToastProvider> must wrap the app (see main.tsx) so that useToast()
 * can trigger toasts from anywhere. Exposes:
 *   - ToastProvider: context provider + viewport that renders the stack
 *   - Toast: presentational single-toast component
 *   - useToastContext: low-level access to the toast store
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import styles from './Toast.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  /** Stable unique id used as the React key. */
  id: number
  /** Visual variant driving color + icon. */
  type: ToastType
  /** Human-readable message body. */
  message: string
}

interface ToastContextValue {
  /** All currently visible toasts, newest last. */
  toasts: ToastItem[]
  /** Push a toast of the given type. Auto-dismisses after AUTO_DISMISS_MS. */
  notify: (type: ToastType, message: string) => void
  /** Immediately remove a toast by id. */
  dismiss: (id: number) => void
  /** Remove every visible toast. */
  clear: () => void
}

// ── Constants ────────────────────────────────────────────────────────────────

/** How long a toast stays on screen before auto-dismissing. */
export const AUTO_DISMISS_MS = 4000

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

/** Access the toast store. Must be used inside <ToastProvider>. */
export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToastContext must be used within <ToastProvider>')
  }
  return ctx
}

// ── Icons ────────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 9.5l2.25 2.25L12.5 6.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.75 6.75l4.5 4.5M11.25 6.75l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 8v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="5.75" r="0.75" fill="currentColor" />
    </svg>
  )
}

const TYPE_ICONS: Record<ToastType, React.FC> = {
  success: SuccessIcon,
  error: ErrorIcon,
  info: InfoIcon,
}

// ── Components ────────────────────────────────────────────────────────────────

export interface ToastProps {
  /** Toast data to display. */
  toast: ToastItem
  /** Called when the user dismisses the toast manually. */
  onDismiss?: (id: number) => void
}

/** Presentational single-toast display. */
export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const Icon = TYPE_ICONS[toast.type]
  const label = toast.type[0].toUpperCase() + toast.type.slice(1)

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{label}</span>
        <span className={styles.message}>{toast.message}</span>
      </span>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export interface ToastProviderProps {
  /** App tree that may call useToast(). */
  children: React.ReactNode
}

/**
 * Provides the toast store to the tree and renders the fixed viewport.
 * Mount once at the root (main.tsx).
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextId.current
      setToasts((prev) => [...prev, { id, type, message }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const clear = useCallback(() => setToasts([]), [])

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss, clear }}>
      {children}
      <div
        className={styles.viewport}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
