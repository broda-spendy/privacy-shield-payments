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
  Identicon,
  BalanceGauge,
  NetworkLatency,
  SystemAlertBanner,
  PercentageSlider,
  WithdrawConfirmationModal,
  TransactionList,
  type Transaction,
} from './components'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import styles from './App.module.css'

const DEMO_ADDRESS = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBRZFGQ7TS5K'

const DEMO_ALERT = {
  id: 'maintenance-2026-08-12',
  severity: 'info' as const,
  message: '🔧 Scheduled Soroban testnet maintenance on Aug 14 02:00–04:00 UTC. Transactions may be delayed.',
  learnMoreUrl: 'https://status.stellar.org',
}

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091',
    type: 'deposit',
    amount: 250,
    timestamp: '2026-08-13T14:32:00Z',
    status: 'confirmed',
  },
  {
    id: 'b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2',
    type: 'transfer',
    amount: 42.5,
    timestamp: '2026-08-13T09:15:00Z',
    status: 'pending',
  },
  {
    id: 'c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3',
    type: 'withdraw',
    amount: 100,
    timestamp: '2026-08-12T18:04:00Z',
    status: 'failed',
  },
]

export default function App() {
  const { isDark, toggleTheme } = useTheme()
  const toast = useToast()
  const [walletAddress, setWalletAddress] = useState<string | null>(DEMO_ADDRESS)
  const [balance, setBalance] = useState(250)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawPct, setWithdrawPct] = useState(0)

  const handleConnect = () => {
    const wasConnected = walletAddress !== null
    setWalletAddress(wasConnected ? null : DEMO_ADDRESS)
    toast.info(wasConnected ? 'Wallet disconnected.' : 'Wallet connected to Privacy Shield.')
  }

  const handleDeposit = async (amount: number) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setBalance((prev) => prev + amount)
    toast.success(`Successfully shielded ${amount} XLM into pool!`)
  }

  const handleTransfer = async (recipient: string, amount: number) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setBalance((prev) => prev - amount)
    toast.success(`Confidential transfer of ${amount} XLM sent to ${recipient.slice(0, 8)}...!`)
  }

  const handleWithdrawConfirm = async () => {
    setWithdrawLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const withdrawAmount = Math.round((withdrawPct / 100) * balance)
    setBalance((prev) => prev - withdrawAmount)
    toast.success(`Successfully withdrew ${withdrawAmount} XLM to your public address!`)
    setWithdrawLoading(false)
    setWithdrawModalOpen(false)
  }

  const withdrawAmount = Math.round((withdrawPct / 100) * balance)

  return (
    <>
      {/* Issue #86 — System alert banner */}
      <SystemAlertBanner alert={DEMO_ALERT} />

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
            {walletAddress && <Identicon address={walletAddress} size={36} />}
            <ContractBadge network="testnet" />
            <BalanceVisibilityToggle amount={balance} symbol="XLM" />
            <NetworkLatency />
          </div>
        </section>

        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>Shield Operations</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
            <DepositForm maxBalance={1000} tokenSymbol="XLM" onDeposit={handleDeposit} />
            <TransferForm shieldedBalance={balance} tokenSymbol="XLM" onTransfer={handleTransfer} />
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <BalanceGauge shieldedAmount={balance} transparentAmount={750} symbol="XLM" />

            <div className={styles.card} style={{ flex: 1, minWidth: 280 }}>
              <h3 className={styles.cardTitle}>Withdrawal Amount (#87 &amp; #88)</h3>
              <p className={styles.cardDesc}>Select a percentage of your shielded balance to unshield.</p>
              <PercentageSlider
                maxBalance={balance}
                value={withdrawPct}
                onChange={setWithdrawPct}
                symbol="XLM"
              />
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(true)}
                disabled={withdrawAmount <= 0}
                style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)',
                  background: 'none',
                  color: 'var(--color-text-primary)',
                  cursor: withdrawAmount > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  opacity: withdrawAmount > 0 ? 1 : 0.5,
                }}
              >
                🔓 Withdraw {withdrawAmount} XLM
              </button>
            </div>
          </div>
        </section>

        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>Transaction History (#52)</h2>
          <TransactionList transactions={DEMO_TRANSACTIONS} tokenSymbol="XLM" />
        </section>

        <section className={styles.demoSection}>
          <h2 className={styles.sectionTitle}>UI Component Library</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Badge &amp; Tooltip (#67)</h3>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant="success">Confirmed</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="error">Failed</Badge>
                <Badge variant="info">Shielded</Badge>
                <Tooltip content="Hover popup tooltip"><Badge variant="neutral">Hover me</Badge></Tooltip>
              </div>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Utilities</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <Identicon address={DEMO_ADDRESS} size={28} />
                <CopyButton value="GAHJJJKM..." label="Copy address" />
                <Spinner size="sm" label="Syncing..." />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Issue #88 — Withdraw Confirmation Modal */}
      <WithdrawConfirmationModal
        isOpen={withdrawModalOpen}
        amount={withdrawAmount}
        recipient={DEMO_ADDRESS}
        estimatedFee={0.00001}
        symbol="XLM"
        isLoading={withdrawLoading}
        onClose={() => setWithdrawModalOpen(false)}
        onConfirm={handleWithdrawConfirm}
      />

      <Footer network="testnet" />
    </>
  )
}
