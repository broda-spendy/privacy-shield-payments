/**
 * App.tsx — root application component.
 *
 * Wires together the Header (issue #49) and CopyButton (issue #51)
 * with a demo page showing both components in context.
 */

import { useState } from 'react'
import { Header, CopyButton } from './components'
import { useTheme } from './hooks/useTheme'
import styles from './App.module.css'

// Demo wallet address (Stellar testnet)
const DEMO_ADDRESS = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBRZFGQ7TS5K'

export default function App() {
  const { isDark, toggleTheme } = useTheme()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  const handleConnect = () => {
    // In production this calls the Freighter API.
    // For the demo, toggle a mock connected state.
    setWalletAddress(prev => (prev ? null : DEMO_ADDRESS))
  }

  return (
    <>
      {/* Issue #49 — Header */}
      <Header
        walletAddress={walletAddress}
        network="testnet"
        onConnectWallet={handleConnect}
        onThemeToggle={toggleTheme}
        isDark={isDark}
      />

      <main className={`main-content container ${styles.main}`}>
        <section className={styles.hero}>
          <div className={styles.heroIcon} aria-hidden="true">🛡️</div>
          <h1 className={styles.heroTitle}>Privacy Shield Payments</h1>
          <p className={styles.heroSub}>
            Confidential peer-to-peer stablecoin transfers on Stellar / Soroban
            with ZK-style privacy and selective disclosure.
          </p>
          {!walletAddress && (
            <button
              id="hero-connect-btn"
              type="button"
              className={styles.heroCta}
              onClick={handleConnect}
            >
              Connect Freighter Wallet →
            </button>
          )}
        </section>

        {/* Issue #51 — CopyButton demo */}
        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>Component Demo</h2>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>CopyButton</h3>
            <p className={styles.cardDesc}>
              Click the clipboard icon next to any value to copy it instantly.
            </p>

            <div className={styles.demoRows}>
              <DemoRow label="Wallet address" value={DEMO_ADDRESS} mono />
              <DemoRow label="Contract ID"    value="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" mono />
              <DemoRow label="Transaction"    value="7a6e4d3b2c1f0e9d8a7b6c5d4e3f2a1b0c9d8e7f" mono />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

// ── Small helper for demo rows ────────────────────────────────────────────────
function DemoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.demoRow}>
      <span className={styles.demoLabel}>{label}</span>
      <div className={styles.demoValue}>
        <span className={mono ? 'font-mono' : ''} style={{ wordBreak: 'break-all' }}>
          {value}
        </span>
        <CopyButton value={value} label={`Copy ${label}`} size={15} />
      </div>
    </div>
  )
}
