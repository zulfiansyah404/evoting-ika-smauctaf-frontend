'use client'

import { useState, useEffect } from 'react'

// Live countdown toward a target ISO datetime.
// variant: 'inline' (compact text) | 'blocks' (segmented boxes)
export default function Countdown({ target, prefix = '', endedText = 'Waktu telah berakhir', variant = 'inline', className = '' }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const targetMs = new Date(target).getTime()
  if (isNaN(targetMs)) return null

  const diff = targetMs - now
  if (diff <= 0) {
    return <span className={className}>{endedText}</span>
  }

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  if (variant === 'blocks') {
    const parts = [
      { v: d, l: 'Hari' },
      { v: h, l: 'Jam' },
      { v: m, l: 'Menit' },
      { v: s, l: 'Detik' },
    ]
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {parts.map((p, i) => (
          <div key={i} className="min-w-[52px] rounded-lg bg-navy text-gold text-center py-2 px-1 border border-gold/20">
            <div className="font-serif text-xl leading-none tabular-nums">{String(p.v).padStart(2, '0')}</div>
            <div className="text-[10px] uppercase tracking-wider text-gold/70 mt-1">{p.l}</div>
          </div>
        ))}
      </div>
    )
  }

  const pad = (n) => String(n).padStart(2, '0')
  const text = d > 0 ? `${d}h ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
  return (
    <span className={`tabular-nums ${className}`}>{prefix}{text}</span>
  )
}
