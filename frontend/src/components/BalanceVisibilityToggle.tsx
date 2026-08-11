/**
 * BalanceVisibilityToggle — Issue #80
 *
 * Eye/eye-off toggle component to hide or reveal confidential balance amounts.
 */

import React, { useState } from 'react'
import styles from './BalanceVisibilityToggle.module.css'

export interface BalanceVisibilityToggleProps {
  /** Unmasked amount string or number to format */
  amount: string | number
  /** Token symbol (e.g. 'XLM'). Default: 'XLM' */
  symbol?: string
  /** Mask character replacement. Default: '••••••' */
  maskString?: string
  /** Initially visible state. Default: true */
  initialVisible?: boolean
  /** Extra CSS classes */
  className?: string
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 2l12 12M6.71 6.71A2 2 0 019.29 9.29M4.22 4.22C2.63 5.25 1.5 6.75 1.5 8c0 0 2.5 5 6.5 5 1.34 0 2.58-.39 3.65-1.04M9.78 4.22C9.21 4.08 8.61 4 8 4c-4 0-6.5 4-6.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const BalanceVisibilityToggle: React.FC<BalanceVisibilityToggleProps> = ({
  amount,
  symbol = 'XLM',
  maskString = '••••••',
  initialVisible = true,
  className = '',
}) => {
  const [visible, setVisible] = useState(initialVisible)

  return (
    <span className={`${styles.wrapper} ${className}`}>
      <span className={visible ? '' : styles.maskedText}>
        {visible ? `${amount} ${symbol}` : `${maskString} ${symbol}`}
      </span>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Hide balance amount' : 'Show balance amount'}
        title={visible ? 'Hide amount' : 'Show amount'}
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </span>
  )
}

export default BalanceVisibilityToggle
