/**
 * NetworkStatusBanner — Issue #74
 *
 * Automatically monitors browser connectivity (`navigator.onLine`) and network state.
 * Displays a dismissible alert banner if offline or connected to an unsupported network.
 *
 * Usage:
 *   <NetworkStatusBanner network="testnet" />
 */

import React, { useState, useEffect } from 'react'
import styles from './NetworkStatusBanner.module.css'

export interface NetworkStatusBannerProps {
  /** Active Stellar network. Default: 'testnet' */
  network?: 'mainnet' | 'testnet' | 'futurenet' | string
  /** Override offline state manually for testing/demo purposes. */
  forceOffline?: boolean
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  network = 'testnet',
  forceOffline = false,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [dismissed, setDismissed] = useState<boolean>(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setDismissed(false)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const effectiveOnline = forceOffline ? false : isOnline

  if (dismissed) return null

  if (!effectiveOnline) {
    return (
      <div className={`${styles.banner} ${styles.offline}`} role="alert">
        <div className={styles.content}>
          <span className={styles.icon}>📡</span>
          <span>
            <strong>Offline Mode:</strong> You are currently disconnected from the internet.
            Soroban transactions and balance updates require network access.
          </span>
        </div>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          title="Dismiss banner"
        >
          ✕
        </button>
      </div>
    )
  }

  if (network !== 'testnet' && network !== 'mainnet') {
    return (
      <div className={`${styles.banner} ${styles.warning}`} role="alert">
        <div className={styles.content}>
          <span className={styles.icon}>⚠️</span>
          <span>
            <strong>Experimental Network:</strong> Connected to custom network &quot;{network}&quot;.
            Ensure your Soroban contract ID is deployed to this RPC endpoint.
          </span>
        </div>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          title="Dismiss banner"
        >
          ✕
        </button>
      </div>
    )
  }

  return null
}

export default NetworkStatusBanner
