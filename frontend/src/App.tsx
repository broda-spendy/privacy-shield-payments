/**
 * App.tsx — root application component.
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
  Badge,
  Tooltip,
  BalanceVisibilityToggle,
  ContractBadge,
} from './components'
import { useTheme } from './hooks/useTheme'
import styles from './App.module.css'

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
      <NetworkStatusBanner network="testnet" />

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <ContractBadge network="testnet" />
            <BalanceVisibilityToggle amount={balance} symbol="XLM" />
          </div>
        </section>

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

        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>UI Primitive Demos (#67, #80, #81)</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {/* Badges & Tooltips */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Badge &amp; Tooltip Components (#67)</h3>
              <p className={styles.cardDesc}>
                Status badges and popover tooltips for UI indicators.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant="success">Confirmed</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="error">Failed</Badge>
                <Badge variant="info">Shielded</Badge>
                <Tooltip content="Hover popup tooltip text">
                  <Badge variant="neutral">Hover me</Badge>
                </Tooltip>
              </div>
            </div>

            {/* Balance Masking */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Balance Visibility Toggle (#80)</h3>
              <p className={styles.cardDesc}>
                Toggle button to hide numeric balances on screen.
              </p>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                <BalanceVisibilityToggle amount={1250.50} symbol="USDC" />
              </div>
            </div>

            {/* Utility Demos */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Utilities (CopyButton &amp; Spinner)</h3>
              <p className={styles.cardDesc}>
                Copy-to-clipboard button and async loading spinners.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <CopyButton value="GAHJJJKM..." label="Copy address" />
                <Spinner size="sm" label="Syncing..." />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer network="testnet" />
    </>
  )
}
