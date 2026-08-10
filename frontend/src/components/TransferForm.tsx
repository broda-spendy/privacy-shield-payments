/**
 * TransferForm — Issue #56 & #24
 *
 * Form component for making confidential transfers.
 * Fully responsive on mobile (320px–480px) with touch-friendly controls (min-height 44px),
 * vertical field stacking, and async loading feedback with <Spinner /> (#47).
 */

import React, { useState } from 'react'
import { Spinner } from './Spinner'
import styles from './Form.module.css'

export interface TransferFormProps {
  /** Connected wallet shielded balance. Default: 500 */
  shieldedBalance?: number
  /** Token symbol. Default: 'XLM' */
  tokenSymbol?: string
  /** Callback fired on form submit. */
  onTransfer?: (recipient: string, amount: number) => Promise<void> | void
  /** External loading state. */
  isLoading?: boolean
}

export const TransferForm: React.FC<TransferFormProps> = ({
  shieldedBalance = 500,
  tokenSymbol = 'XLM',
  onTransfer,
  isLoading: externalLoading = false,
}) => {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({})
  const [internalLoading, setInternalLoading] = useState(false)

  const loading = externalLoading || internalLoading

  const validate = () => {
    const newErrors: { recipient?: string; amount?: string } = {}

    if (!recipient.trim()) {
      newErrors.recipient = 'Recipient address is required.'
    } else if (!recipient.startsWith('G') || recipient.length !== 56) {
      newErrors.recipient = 'Must be a valid 56-character Stellar public address (G...).'
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid transfer amount > 0.'
    } else if (parsedAmount > shieldedBalance) {
      newErrors.amount = `Amount exceeds shielded balance (${shieldedBalance} ${tokenSymbol}).`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setInternalLoading(true)
    try {
      if (onTransfer) {
        await onTransfer(recipient, parseFloat(amount))
      }
      setRecipient('')
      setAmount('')
      setErrors({})
    } catch (err: unknown) {
      setErrors({
        amount: err instanceof Error ? err.message : 'Transfer failed.',
      })
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>
          <span>🔒</span> Confidential Transfer
        </h3>
        <p className={styles.formDesc}>
          Send tokens confidentially without revealing amount or balances on-chain.
        </p>
      </div>

      <div className={styles.formBody}>
        {/* Recipient Address */}
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="transfer-recipient">
            Recipient Address (Stellar G...)
          </label>
          <input
            id="transfer-recipient"
            type="text"
            placeholder="GAHJJJK..."
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value)
              if (errors.recipient) setErrors((prev) => ({ ...prev, recipient: undefined }))
            }}
            disabled={loading}
            className={`${styles.input} font-mono ${errors.recipient ? styles.inputError : ''}`}
          />
          {errors.recipient && <span className={styles.errorText}>⚠️ {errors.recipient}</span>}
        </div>

        {/* Amount */}
        <div className={styles.fieldGroup}>
          <div className={styles.label}>
            <label htmlFor="transfer-amount">Transfer Amount</label>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Shielded: {shieldedBalance} {tokenSymbol}
            </span>
          </div>
          <div className={styles.inputWrapper}>
            <input
              id="transfer-amount"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }))
              }}
              disabled={loading}
              className={`${styles.input} ${errors.amount ? styles.inputError : ''}`}
            />
            <span className={styles.tokenAddon}>{tokenSymbol}</span>
          </div>
          {errors.amount && <span className={styles.errorText}>⚠️ {errors.amount}</span>}
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !recipient || !amount}
        >
          {loading ? (
            <Spinner size="sm" label="Generating zero-knowledge proof..." />
          ) : (
            'Send Confidential Transfer'
          )}
        </button>
      </div>
    </form>
  )
}

export default TransferForm
