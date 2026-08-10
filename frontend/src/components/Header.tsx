/**
 * Header — Issue #49
 *
 * App-wide fixed navigation bar that:
 *  - Shows the Privacy Shield logo + name on the left
 *  - Shows the connected Freighter wallet address (truncated) on the right,
 *    with a green status indicator and network badge
 *  - Shows a "Connect Wallet" button when no wallet is connected
 *  - Includes an optional dark/light mode toggle
 *  - Responds correctly on mobile (380px–480px)
 *
 * Usage:
 *   <Header
 *     walletAddress="GABC...XYZ"   // full address, will be truncated
 *     network="testnet"
 *     onConnectWallet={() => { ... }}
 *     onThemeToggle={() => { ... }}
 *     isDark={true}
 *   />
 */

import { useEffect, useState } from 'react'
import { CopyButton } from './CopyButton'
import styles from './Header.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  /** Full Stellar public key (G...). Null = wallet not connected. */
  walletAddress?: string | null
  /** Network label shown as a badge next to the address. */
  network?: 'mainnet' | 'testnet' | 'futurenet'
  /** Called when the user clicks "Connect Wallet". */
  onConnectWallet?: () => void
  /** Called when the user clicks the theme toggle. */
  onThemeToggle?: () => void
  /** Current theme — used to render the correct icon. */
  isDark?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Truncates a Stellar address to the form `GABC…WXYZ`.
 * Keeps the first 4 and last 4 characters for recognition at a glance.
 */
function truncateAddress(address: string, leading = 4, trailing = 4): string {
  if (address.length <= leading + trailing + 1) return address
  return `${address.slice(0, leading)}…${address.slice(-trailing)}`
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 1.5L2.25 4.5v5.25c0 3.375 2.85 6.525 6.75 7.5 3.9-.975 6.75-4.125 6.75-7.5V4.5L9 1.5z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M6.75 9.375L8.25 10.875l3-3"
        stroke="hsl(246 80% 62%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 10.5A6 6 0 015.5 2.5a6.5 6.5 0 108 8z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M1 6h12" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="10" cy="9" r="1" fill="currentColor" />
      <path d="M4 1.5h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Header({
  walletAddress = null,
  network = 'testnet',
  onConnectWallet,
  onThemeToggle,
  isDark = true,
}: HeaderProps) {
  // Add a shadow once the user scrolls down
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>

        {/* ── Brand ── */}
        <a href="/" className={styles.brand} aria-label="Privacy Shield Payments — home">
          <div className={styles.logoMark} aria-hidden="true">
            <ShieldIcon />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Privacy Shield</span>
            <span className={styles.brandTagline}>Stellar · Soroban</span>
          </div>
        </a>

        {/* ── Right-side actions ── */}
        <div className={styles.actions}>

          {/* Theme toggle */}
          {onThemeToggle && (
            <button
              type="button"
              className={styles.themeToggle}
              onClick={onThemeToggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          )}

          {/* Wallet: connected state */}
          {walletAddress ? (
            <div
              className={styles.walletChip}
              title={walletAddress}
              aria-label={`Connected wallet: ${walletAddress}`}
            >
              <span className={styles.statusDot} aria-hidden="true" />

              <span className={`${styles.walletAddress} font-mono`}>
                {truncateAddress(walletAddress)}
              </span>

              <CopyButton
                value={walletAddress}
                label="Copy full wallet address"
                size={13}
              />

              <span className={styles.networkBadge} aria-label={`Network: ${network}`}>
                {network}
              </span>
            </div>
          ) : (
            /* Wallet: disconnected state */
            <button
              id="connect-wallet-btn"
              type="button"
              className={styles.connectBtn}
              onClick={onConnectWallet}
              aria-label="Connect Freighter wallet"
            >
              <WalletIcon />
              <span>Connect Wallet</span>
            </button>
          )}

        </div>
      </div>
    </header>
  )
}

export default Header
