/**
 * Badge — Issue #67
 *
 * Status tag component supporting variants: success, warning, error, info, neutral.
 */

import React from 'react'
import styles from './Badge.module.css'

export interface BadgeProps {
  /** Visual status variant. Default: 'neutral' */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  /** Show leading status dot indicator. Default: true */
  showDot?: boolean
  /** Badge content */
  children: React.ReactNode
  /** Extra CSS classes */
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  showDot = true,
  children,
  className = '',
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {showDot && <span className={styles.dot} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}

export default Badge
