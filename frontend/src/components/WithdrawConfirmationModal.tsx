/**
 * WithdrawConfirmationModal — Issue #88
 *
 * Confirmation modal displayed before unshielding/withdrawing tokens.
 * Shows full breakdown: amount, estimated fee, recipient address, and net total.
 */

import React from 'react'
import styles from './WithdrawConfirmationModal.module.css'
import { Spinner } from './Spinner'

export interface WithdrawConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Amount to unshield */
  amount: number
  /** Recipient address (public Stellar key) */
  recipient: string
  /** Estimated network fee */
  estimatedFee?: number
  /** Token symbol. Default: 'XLM' */
  symbol?: string
  /** Whether submit is in progress */
  isLoading?: boolean
  /** Close / cancel callback */
  onClose: () => void
  /** Confirmed submit callback */
  onConfirm: () => void
}

export const WithdrawConfirmationModal: React.FC<WithdrawConfirmationModalProps> = ({
  isOpen,
  amount,
  recipient,
  estimatedFee = 0.00001,
  symbol = 'XLM',
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null

  const netAmount = Math.max(0, amount - estimatedFee)
  const truncatedRecipient = `${recipient.slice(0, 8)}…${recipient.slice(-6)}`

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-modal-title"
      >
        <div className={styles.header}>
          <h2 className={styles.title} id="withdraw-modal-title">
            🔓 Confirm Withdrawal
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Amount to withdraw</span>
            <span className={styles.detailValue}>{amount} {symbol}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Recipient</span>
            <span className={styles.detailValue} title={recipient}>{truncatedRecipient}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Estimated network fee</span>
            <span className={styles.detailValue}>{estimatedFee.toFixed(5)} {symbol}</span>
          </div>
          <hr className={styles.divider} />
          <div className={`${styles.detailRow} ${styles.totalRow}`}>
            <span className={styles.detailLabel}>You receive</span>
            <span className={styles.detailValue}>{netAmount.toFixed(5)} {symbol}</span>
          </div>
        </div>

        <div className={styles.warning}>
          <span>⚠️</span>
          <span>
            Withdrawing will move tokens from your shielded pool to a public Stellar address.
            This action is irreversible and may reveal transaction history.
          </span>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner size="sm" label="Unshielding..." />
            ) : (
              'Confirm Withdrawal'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WithdrawConfirmationModal
