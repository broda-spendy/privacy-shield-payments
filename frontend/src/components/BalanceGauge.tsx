/**
 * BalanceGauge — Issue #93
 *
 * SVG circular progress gauge illustrating the percentage of account total
 * held in the shielded pool vs transparent balance.
 */

import React from 'react'
import styles from './BalanceGauge.module.css'

export interface BalanceGaugeProps {
  /** Shielded balance amount */
  shieldedAmount: number
  /** Transparent (public) balance amount */
  transparentAmount: number
  /** Token symbol (e.g. 'XLM'). Default: 'XLM' */
  symbol?: string
  /** Size in pixels. Default: 64 */
  size?: number
  /** Extra CSS classes */
  className?: string
}

export const BalanceGauge: React.FC<BalanceGaugeProps> = ({
  shieldedAmount,
  transparentAmount,
  symbol = 'XLM',
  size = 64,
  className = '',
}) => {
  const total = shieldedAmount + transparentAmount
  const percentage = total > 0 ? Math.min(100, Math.round((shieldedAmount / total) * 100)) : 0

  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.gaugeWrapper} style={{ width: size, height: size }}>
        <svg className={styles.gaugeSvg} width={size} height={size} viewBox="0 0 60 60">
          <circle
            className={styles.bgCircle}
            cx="30"
            cy="30"
            r={radius}
            strokeWidth="5"
            fill="none"
          />
          <circle
            className={styles.meterCircle}
            cx="30"
            cy="30"
            r={radius}
            strokeWidth="5"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className={styles.percentageText}>{percentage}%</span>
      </div>

      <div className={styles.info}>
        <span className={styles.title}>Shielded Ratio</span>
        <span className={styles.sub}>
          {shieldedAmount} / {total} {symbol} Shielded
        </span>
      </div>
    </div>
  )
}

export default BalanceGauge
