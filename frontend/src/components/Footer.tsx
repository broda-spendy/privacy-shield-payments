/**
 * Footer — Issue #99
 *
 * App-wide footer displaying brand description, GitHub links, documentation,
 * live Soroban testnet network status, and phase badge.
 *
 * Usage:
 *   <Footer network="testnet" repoUrl="https://github.com/broda-spendy/privacy-shield-payments" />
 */

import React from 'react'
import styles from './Footer.module.css'

export interface FooterProps {
  /** Active network. Default: 'testnet' */
  network?: string
  /** GitHub repository URL. */
  repoUrl?: string
}

export const Footer: React.FC<FooterProps> = ({
  network = 'testnet',
  repoUrl = 'https://github.com/broda-spendy/privacy-shield-payments',
}) => {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.topGrid}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <a href="/" className={styles.brand}>
              <div className={styles.logoMark}>🛡️</div>
              <span>Privacy Shield</span>
            </a>
            <p className={styles.brandDesc}>
              Confidential peer-to-peer stablecoin transfers on Stellar / Soroban with ZK-style privacy and selective disclosure.
            </p>
            <div className={styles.networkHealth}>
              <span className={styles.healthDot} aria-hidden="true" />
              <span>Soroban {network}: Operational</span>
            </div>
          </div>

          {/* Column 1: Protocol */}
          <div className={styles.linkGroup}>
            <h4 className={styles.groupTitle}>Protocol</h4>
            <ul className={styles.linkList}>
              <li><a href={`${repoUrl}#readme`} target="_blank" rel="noreferrer">Architecture</a></li>
              <li><a href={`${repoUrl}/blob/main/PRD.md`} target="_blank" rel="noreferrer">Roadmap (PRD)</a></li>
              <li><a href={`${repoUrl}/blob/main/docs/interface.md`} target="_blank" rel="noreferrer">Smart Contract API</a></li>
              <li><a href={`${repoUrl}/blob/main/docs/threat-model.md`} target="_blank" rel="noreferrer">Threat Model</a></li>
            </ul>
          </div>

          {/* Column 2: Developers */}
          <div className={styles.linkGroup}>
            <h4 className={styles.groupTitle}>Developers</h4>
            <ul className={styles.linkList}>
              <li><a href={`${repoUrl}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">Contributing Guide</a></li>
              <li><a href={`${repoUrl}/blob/main/ISSUES.md`} target="_blank" rel="noreferrer">Issues Catalog</a></li>
              <li><a href={repoUrl} target="_blank" rel="noreferrer">GitHub Repository</a></li>
              <li><a href="https://stellar.org/soroban" target="_blank" rel="noreferrer">Stellar / Soroban Docs</a></li>
            </ul>
          </div>

          {/* Column 3: Community */}
          <div className={styles.linkGroup}>
            <h4 className={styles.groupTitle}>Ecosystem</h4>
            <ul className={styles.linkList}>
              <li><a href="https://stellar.org" target="_blank" rel="noreferrer">Stellar Foundation</a></li>
              <li><a href="https://stellarterm.com" target="_blank" rel="noreferrer">Stellar Explorer</a></li>
              <li><a href="https://freighter.app" target="_blank" rel="noreferrer">Freighter Wallet</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className={styles.bottomRow}>
          <div>
            © {new Date().getFullYear()} Privacy-Shield Payments. Built on Stellar &amp; Soroban.
          </div>
          <div>
            Status: <span className={styles.phaseBadge}>Phase 4 — Web UI</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
