/**
 * Identicon — Issue #89
 *
 * Deterministic SVG identicon avatar component generated from a Stellar address string.
 */

import React, { useMemo } from 'react'
import styles from './Identicon.module.css'

export interface IdenticonProps {
  /** Stellar address (G...) */
  address: string
  /** Size in pixels. Default: 32 */
  size?: number
  /** Extra CSS classes */
  className?: string
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getColors(hash: number): [string, string, string] {
  const h1 = hash % 360
  const h2 = (hash * 7) % 360
  const h3 = (hash * 13) % 360
  return [
    `hsl(${h1}, 70%, 55%)`,
    `hsl(${h2}, 65%, 45%)`,
    `hsl(${h3}, 80%, 60%)`,
  ]
}

export const Identicon: React.FC<IdenticonProps> = ({
  address,
  size = 32,
  className = '',
}) => {
  const { color1, color2, color3, rotation } = useMemo(() => {
    const hash = simpleHash(address || 'G')
    const [c1, c2, c3] = getColors(hash)
    const rot = hash % 360
    return { color1: c1, color2: c2, color3: c3, rotation: rot }
  }, [address])

  return (
    <div
      className={`${styles.identicon} ${className}`}
      style={{ width: size, height: size }}
      title={address}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" fill={color1} />
        <circle
          cx="16"
          cy="16"
          r="10"
          fill={color2}
          transform={`rotate(${rotation} 16 16)`}
        />
        <rect
          x="8"
          y="8"
          width="16"
          height="16"
          rx="4"
          fill={color3}
          fillOpacity="0.75"
          transform={`rotate(${rotation / 2} 16 16)`}
        />
      </svg>
    </div>
  )
}

export default Identicon
