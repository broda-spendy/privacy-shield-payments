/**
 * ContractBadge — Issue #81
 *
 * Displays the active Soroban contract ID with an inline CopyButton and an
 * external link to the StellarExpert block explorer.
 */

import React from 'react'
import { CopyButton } from './CopyButton'
import styles from './ContractBadge.module.css'

export interface ContractBadgeProps {
  /** Soroban contract ID. Default: demo contract ID */
  contractId?: string
  /** Active network ('testnet' | 'mainnet' | 'futurenet'). Default: 'testnet' */
  network?: string
  /** Extra CSS classes */
  className?: string
}

const DEFAULT_CONTRACT = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'

function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3M9 3h4v4M8 8l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 6)}…${id.slice(-6)}`
}

export const ContractBadge: React.FC<ContractBadgeProps> = ({
  contractId = DEFAULT_CONTRACT,
  network = 'testnet',
  className = '',
}) => {
  const explorerUrl = `https://stellar-expert.com/explorer/${network}/contract/${contractId}`

  return (
    <div className={`${styles.badge} ${className}`}>
      <span className={styles.label}>Contract</span>
      <span className={styles.contractId} title={contractId}>
        {truncateId(contractId)}
      </span>
      <CopyButton value={contractId} label="Copy Contract ID" size={13} />
      <a
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.explorerLink}
        title="View on StellarExpert Explorer"
        aria-label="View on StellarExpert Explorer"
      >
        <ExternalLinkIcon />
      </a>
    </div>
  )
}

export default ContractBadge
