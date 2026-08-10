/**
 * Spinner — Issue #47
 *
 * Reusable loading spinner component used during async operations
 * (wallet connection, contract transactions, deposit, transfer).
 *
 * Usage:
 *   <Spinner size="sm" />
 *   <Spinner size="md" label="Processing transaction..." />
 *   <Spinner size="lg" />
 */

import React from 'react'
import styles from './Spinner.module.css'

export interface SpinnerProps {
  /** Size variant: 'sm' (16px), 'md' (24px), or 'lg' (40px). Default: 'md'. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional accessible label displayed next to or hidden for screen readers. */
  label?: string
  /** If true, visually hides the label text while keeping it accessible to screen readers. */
  hideLabelText?: boolean
  /** Extra CSS classes applied to root element. */
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  label = 'Loading...',
  hideLabelText = false,
  className = '',
}) => {
  return (
    <span
      className={`${styles.wrapper} ${className}`}
      role="status"
      aria-label={label}
    >
      <span className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />
      {label && (
        <span className={hideLabelText ? 'sr-only' : styles.label}>
          {label}
        </span>
      )}
    </span>
  )
}

export default Spinner
