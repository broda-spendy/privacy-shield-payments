/**
 * NetworkLatency — Issue #95
 *
 * Measures and displays live RPC response ping/latency in milliseconds.
 */

import React, { useState, useEffect } from 'react'
import styles from './NetworkLatency.module.css'

export interface NetworkLatencyProps {
  /** RPC endpoint URL to ping. Default: Soroban Testnet RPC */
  rpcUrl?: string
  /** Poll interval in milliseconds. Default: 10000 (10s) */
  pollInterval?: number
  /** Extra CSS classes */
  className?: string
}

export const NetworkLatency: React.FC<NetworkLatencyProps> = ({
  rpcUrl = 'https://soroban-testnet.stellar.org',
  pollInterval = 10000,
  className = '',
}) => {
  const [latency, setLatency] = useState<number | null>(45) // Default initial estimate
  const [status, setStatus] = useState<'good' | 'moderate' | 'poor'>('good')

  useEffect(() => {
    let isMounted = true

    const measurePing = async () => {
      const start = performance.now()
      try {
        await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
        })
        const duration = Math.round(performance.now() - start)
        if (isMounted) {
          setLatency(duration)
          if (duration < 150) setStatus('good')
          else if (duration < 400) setStatus('moderate')
          else setStatus('poor')
        }
      } catch {
        if (isMounted) {
          setLatency(null)
          setStatus('poor')
        }
      }
    }

    measurePing()
    const timer = setInterval(measurePing, pollInterval)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [rpcUrl, pollInterval])

  return (
    <div className={`${styles.wrapper} ${className}`} title={`Soroban RPC Ping: ${latency !== null ? `${latency}ms` : 'Disconnected'}`}>
      <span className={`${styles.statusDot} ${styles[status]}`} aria-hidden="true" />
      <span>{latency !== null ? `${latency} ms` : 'Offline'}</span>
    </div>
  )
}

export default NetworkLatency
