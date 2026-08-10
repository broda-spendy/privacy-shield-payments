/**
 * CopyButton — Issue #51
 *
 * A small inline icon button that copies a given string value to the
 * clipboard. Shows a clipboard icon by default; switches to a checkmark
 * for 2 seconds after a successful copy. Falls back gracefully when the
 * Clipboard API is unavailable (legacy browsers).
 *
 * Usage:
 *   <CopyButton value="GABC...XYZ" label="Copy wallet address" />
 *   <CopyButton value={txHash} size={20} />
 */

import { useState, useCallback, useRef } from 'react'
import styles from './CopyButton.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

interface CopyButtonProps {
  /** The string value to copy to the clipboard. */
  value: string
  /** Accessible label for screen readers. Defaults to "Copy to clipboard". */
  label?: string
  /** Icon size in pixels. Defaults to 16. */
  size?: number
  /** Extra CSS class applied to the root wrapper. */
  className?: string
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────

function ClipboardIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={styles.icon}
    >
      <rect x="5" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3 4H2a1 1 0 00-1 1v9a1 1 0 001 1h7a1 1 0 001-1v-1"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`${styles.icon} ${styles.iconEnter}`}
    >
      <path
        d="M2.5 8.5l3.5 3.5 7-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function CopyButton({
  value,
  label = 'Copy to clipboard',
  size = 16,
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value)
      } else {
        // Legacy fallback
        const textArea = document.createElement('textarea')
        textArea.value = value
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      setCopied(true)
      setShowTooltip(true)
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
        setShowTooltip(false)
      }, 2000)
    } catch {
      // Copy failed silently — user will notice nothing changed
    }
  }, [value])

  const handleMouseEnter = () => setShowTooltip(true)
  const handleMouseLeave = () => {
    if (!copied) setShowTooltip(false)
  }

  return (
    <span
      className={`${styles.wrapper} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleCopy}
        className={`${styles.btn} ${copied ? styles.copied : ''}`}
        aria-label={copied ? 'Copied!' : label}
        title={copied ? 'Copied!' : label}
      >
        {copied ? <CheckIcon size={size} /> : <ClipboardIcon size={size} />}
      </button>

      {showTooltip && (
        <span className={styles.tooltip} role="tooltip" aria-live="polite">
          {copied ? '✓ Copied!' : 'Copy'}
        </span>
      )}
    </span>
  )
}

export default CopyButton
