/**
 * SystemAlertBanner — Issue #86
 *
 * Dismissible banner for scheduled maintenance windows and system alerts.
 * Supports info (default) and warning severity levels.
 */

import React, { useState } from 'react'
import styles from './SystemAlertBanner.module.css'

export interface SystemAlert {
  id: string
  severity?: 'info' | 'warning'
  message: string
  learnMoreUrl?: string
}

export interface SystemAlertBannerProps {
  /** Alert to display. If undefined, nothing is rendered. */
  alert?: SystemAlert
}

export const SystemAlertBanner: React.FC<SystemAlertBannerProps> = ({ alert }) => {
  const [dismissed, setDismissed] = useState<string | null>(null)

  if (!alert || dismissed === alert.id) return null

  const icon = alert.severity === 'warning' ? '⚠️' : 'ℹ️'

  return (
    <div
      className={`${styles.banner} ${alert.severity === 'warning' ? styles.warning : ''}`}
      role="alert"
    >
      <div className={styles.content}>
        <span className={styles.icon}>{icon}</span>
        <span>{alert.message}</span>
      </div>
      <div className={styles.actions}>
        {alert.learnMoreUrl && (
          <a
            href={alert.learnMoreUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.learnMoreLink}
          >
            Learn more ↗
          </a>
        )}
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => setDismissed(alert.id)}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default SystemAlertBanner
