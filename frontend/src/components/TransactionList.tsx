/**
 * TransactionList — Issue #52
 *
 * Read-only history component that renders past shield/deposit/withdraw
 * transactions for the connected wallet. Each row shows a type icon,
 * truncated transaction id, amount, date, and a status badge.
 *
 * Shows a friendly empty state when the transactions array is empty.
 */

import React from 'react'
import { Badge } from './Badge'
import styles from './TransactionList.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

export type TransactionType = 'deposit' | 'transfer' | 'withdraw'

export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export interface Transaction {
  /** Transaction hash or unique identifier. */
  id: string
  /** Kind of operation: shield deposit, confidential transfer, or withdraw. */
  type: TransactionType
  /** Token amount, in whole units (e.g. 12.5 XLM). */
  amount: number
  /** Unix timestamp (ms) or ISO date string of when the tx occurred. */
  timestamp: number | string
  /** Settlement status driving the badge color. */
  status: TransactionStatus
}

export interface TransactionListProps {
  /** Transactions to render, newest first. */
  transactions: Transaction[]
  /** Token symbol shown next to amounts. Default: 'XLM' */
  tokenSymbol?: string
}

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Deposit',
  transfer: 'Transfer',
  withdraw: 'Withdraw',
}

const TYPE_ICONS: Record<TransactionType, string> = {
  deposit: '📥',
  transfer: '🔒',
  withdraw: '🔓',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Truncates a long tx id to `GA…XYZ` style. */
function truncateId(id: string, leading = 10, trailing = 4): string {
  if (id.length <= leading + trailing) return id
  return `${id.slice(0, leading)}…${id.slice(-trailing)}`
}

/** Formats a timestamp (number|string) as a short readable date. */
function formatDate(timestamp: number | string): string {
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return String(timestamp)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_BADGE_VARIANT: Record<TransactionStatus, 'success' | 'warning' | 'error'> = {
  confirmed: 'success',
  pending: 'warning',
  failed: 'error',
}

// ── Components ───────────────────────────────────────────────────────────────

/** Empty-state shown when there are no transactions yet. */
export const EmptyState: React.FC<{ tokenSymbol?: string }> = ({ tokenSymbol }) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon} aria-hidden="true">🛡️</div>
    <p className={styles.emptyTitle}>No transactions yet</p>
    <p className={styles.emptyDesc}>
      Deposits, confidential transfers, and withdrawals will appear here.
    </p>
    {tokenSymbol && (
      <p className={styles.emptyHint}>
        Try a shield deposit to create your first {tokenSymbol} balance.
      </p>
    )}
  </div>
)

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  tokenSymbol = 'XLM',
}) => {
  if (transactions.length === 0) {
    return <EmptyState tokenSymbol={tokenSymbol} />
  }

  return (
    <div className={styles.list}>
      {transactions.map((tx) => (
        <div key={tx.id} className={styles.row}>
          <div className={styles.typeIcon} aria-hidden="true">
            <span>{TYPE_ICONS[tx.type]}</span>
          </div>

          <div className={styles.details}>
            <div className={styles.rowTop}>
              <span className={styles.typeLabel}>{TYPE_LABELS[tx.type]}</span>
              <span className={styles.txId} title={tx.id}>
                {truncateId(tx.id)}
              </span>
            </div>
            <span className={styles.date}>{formatDate(tx.timestamp)}</span>
          </div>

          <div className={styles.meta}>
            <span className={styles.amount}>
              {tx.type === 'withdraw' ? '−' : '+'}
              {tx.amount.toLocaleString()} {tokenSymbol}
            </span>
            <Badge variant={STATUS_BADGE_VARIANT[tx.status]}>{tx.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TransactionList
