/**
 * App.tsx — root application component.
 *
 * Demonstrates:
 *  - NetworkStatusBanner (issue #74)
 *  - Header & CopyButton (issues #49 & #51)
 *  - Spinner component (issue #47)
 *  - Responsive DepositForm & TransferForm (issues #56, #23, #24)
 *  - Footer component (issue #99)
 */

import { useState } from 'react'
import {
  Header,
  CopyButton,
  Spinner,
  DepositForm,
  TransferForm,
  NetworkStatusBanner,
  Footer,
} from './components'
import { useTheme } from './hooks/useTheme'
import styles from './App.module.css'

// Demo wallet address (Stellar testnet)
const DEMO_ADDRESS = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBRZFGQ7TS5K'

export default function App() {
  const { isDark, toggleTheme } = useTheme()
  const [walletAddress, setWalletAddress] = useState<string | null>(DEMO_ADDRESS)
  const [balance, setBalance] = useState(250)
  const [lastTxMessage, setLastTxMessage] = useState<string | null>(null)

  const handleConnect = () => {
    setWalletAddress(prev => (prev ? null : DEMO_ADDRESS))
  }

  const handleDeposit = async (amount: number) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setBalance((prev) => prev + amount)
    setLastTxMessage(`Successfully shielded ${amount} XLM into pool!`)
  }

  const handleTransfer = async (recipient: string, amount: number) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setBalance((prev) => prev - amount)
    setLastTxMessage(`Confidential transfer of ${amount} XLM sent to ${recipient.slice(0, 8)}...!`)
  }

  return (
    <>
      {/* Issue #74 — NetworkStatusBanner */}
      <NetworkStatusBanner network="testnet" />

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

        {/* Transaction Feedback banner if active */}
        {lastTxMessage && (
          <div style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>✅ {lastTxMessage}</span>
            <button
              onClick={() => setLastTxMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Issue #56 — Responsive Forms grid */}
        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>Shield Operations</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            <DepositForm
              maxBalance={1000}
              tokenSymbol="XLM"
              onDeposit={handleDeposit}
            />
            <TransferForm
              shieldedBalance={balance}
              tokenSymbol="XLM"
              onTransfer={handleTransfer}
            />
          </div>
        </section>

        {/* Issue #47 & #51 — Component Demo Section */}
        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>Component Library Demos</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {/* CopyButton card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>CopyButton Component (#51)</h3>
              <p className={styles.cardDesc}>
                Inline copy button with tooltip feedback and fallback support.
              </p>
              <div className={styles.demoRows}>
                <DemoRow label="Wallet address" value={DEMO_ADDRESS} mono />
                <DemoRow label="Contract ID" value="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" mono />
              </div>
            </div>

            {/* Spinner card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Spinner Component (#47)</h3>
              <p className={styles.cardDesc}>
                Accessible loading spinner with size variants (sm, md, lg).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', paddingTop: 'var(--space-2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Spinner size="sm" label="Small" />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>sm</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Spinner size="md" label="Medium" />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>md</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Spinner size="lg" label="Large" />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>lg</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Issue #99 — Footer */}
      <Footer network="testnet" />
    </>
  )
}

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
