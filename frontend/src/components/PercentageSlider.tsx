/**
 * PercentageSlider — Issue #87
 *
 * Quick balance percentage selector with preset pills (25%, 50%, 75%, 100%)
 * and a styled range slider. Useful in deposit and transfer forms.
 */

import React, { useState, useCallback } from 'react'
import styles from './PercentageSlider.module.css'

const PRESET_PERCENTAGES = [25, 50, 75, 100]

export interface PercentageSliderProps {
  /** Maximum available balance. */
  maxBalance: number
  /** Current selected percentage (0–100). Default: 0 */
  value?: number
  /** Called with percentage (0–100) when changed. */
  onChange: (percentage: number) => void
  /** Token symbol. Default: 'XLM' */
  symbol?: string
}

export const PercentageSlider: React.FC<PercentageSliderProps> = ({
  maxBalance,
  value = 0,
  onChange,
  symbol = 'XLM',
}) => {
  const [pct, setPct] = useState(value)

  const handleChange = useCallback((newPct: number) => {
    setPct(newPct)
    onChange(newPct)
  }, [onChange])

  const computedAmount = ((pct / 100) * maxBalance).toFixed(2)

  return (
    <div className={styles.wrapper}>
      <div className={styles.pills}>
        {PRESET_PERCENTAGES.map(p => (
          <button
            key={p}
            type="button"
            className={`${styles.pill} ${pct === p ? styles.pillActive : ''}`}
            onClick={() => handleChange(p)}
          >
            {p}%
          </button>
        ))}
      </div>

      <div className={styles.sliderRow}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          className={styles.slider}
          style={{ '--fill-pct': `${pct}%` } as React.CSSProperties}
          onChange={e => handleChange(Number(e.target.value))}
          aria-label="Balance percentage selector"
        />
        <span className={styles.valueLabel}>
          {computedAmount} {symbol}
        </span>
      </div>
    </div>
  )
}

export default PercentageSlider
