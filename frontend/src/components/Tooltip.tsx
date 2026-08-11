/**
 * Tooltip — Issue #67
 *
 * Popover tooltip component supporting positioning: top, bottom, left, right.
 */

import React, { useState } from 'react'
import styles from './Tooltip.module.css'

export interface TooltipProps {
  /** Tooltip text content */
  content: string
  /** Position relative to child element. Default: 'top' */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Child element that triggers tooltip on hover/focus */
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
}) => {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={`${styles.tooltip} ${styles[position]}`}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  )
}

export default Tooltip
