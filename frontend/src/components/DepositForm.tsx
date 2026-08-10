/**
 * DepositForm — Issue #56 & #23
 *
 * Form component for shielding tokens into the Privacy Shield pool.
 * Fully responsive on mobile (320px–480px) with 44px minimum touch targets,
 * vertical stacking, and async loading feedback using <Spinner /> (#47).
 */

import React, { useState } from 'react'
import { Spinner } from './Spinner'
import styles from './Form.module.css'

export interface DepositFormProps {
  /** Maximum available balance to deposit. Default: 1000 */
  maxBalance?: number
  /** Token symbol. Default: 'XLM' */
  tokenSymbol?: string
  /** Callback fired when user submits the deposit form. */
  onDeposit?: (amount: number) => Promise<void> | void
  /** External loading state. */
  isLoading?: boolean
}

export const DepositForm: React.FC<DepositFormProps> = ({
  maxBalance = 1000,
  tokenSymbol = 'XLM',
  onDeposit,
  isLoading: externalLoading = false,
}) => {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [internalLoading, setInternalLoading] = useState(false)

  const loading = externalLoading || internalLoading

  const handleMaxClick = () => {
    setAmount(maxBalance.toString())
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid deposit amount > 0.')
      return
    }

    if (parsed > maxBalance) {
      setError(`Amount exceeds available balance (${maxBalance} ${tokenSymbol}).`)
      return
    }

    setInternalLoading(true)
    try {
      if (onDeposit) {
        await onDeposit(parsed)
      }
      setAmount('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deposit failed.')
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>
          <span>📥</span> Shield Deposit
        </h3>
        <p className={styles.formDesc}>
          Lock underlying tokens into the shield pool to create a confidential balance.
        </p>
      </div>

      <div className={styles.formBody}>
        <div className={styles.fieldGroup}>
          <div className={styles.label}>
            <span>Deposit Amount</span>
            <button
              type="button"
              onClick={handleMaxClick}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-brand-primary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              MAX ({maxBalance} {tokenSymbol})
            </button>
          </div>

          <div className={styles.inputWrapper}>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (error) setError(null)
              }}
              disabled={loading}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
            />
            <span className={styles.tokenAddon}>{tokenSymbol}</span>
          </div>

          {error && <span className={styles.errorText}>⚠️ {error}</span>}
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !amount}
        >
          {loading ? (
            <Spinner size="sm" label="Shielding tokens..." />
          ) : (
            'Shield Tokens'
          )}
        </button>
      </div>
    </form>
  )
}

export default DepositForm
