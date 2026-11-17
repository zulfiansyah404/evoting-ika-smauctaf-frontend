'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch, fmtDate, electionStatus } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  CalendarDays, UserSquare2, Users2, Vote, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { CHART_COLORS } from '@/components/admin/admin-shared'

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [ballots, setBallots] = useState<any[]>([])

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    setLoading(true)
    try {
      const [el, ca, us, bl] = await Promise.all([
        apiFetch('/admin/elections').catch(() => apiFetch('/elections').catch(() => ({ data: [] }))),
        apiFetch('/admin/candidates').catch(() => ({ data: [] })),
        apiFetch('/admin/users?limit=1').catch(() => ({ data: [] })),
        apiFetch('/admin/ballots').catch(() => ({ data: [] })),
      ])
      setElections(Array.isArray(el?.data) ? el.data : [])
      setCandidates(Array.isArray(ca?.data) ? ca.data : [])
      setUsers(Array.isArray(us?.data) ? us.data : [])
      setTotalUsers(us?.meta?.total ?? (Array.isArray(us?.data) ? us.data.length : 0))
      setBallots(Array.isArray(bl?.data) ? bl.data : [])
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat ringkasan')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { label: 'Total Pemilihan', value: elections.length, icon: CalendarDays, href: '/admin/elections' },
    { label: 'Pilihan Suara', value: candidates.length, icon: UserSquare2, href: '/admin/candidates' },
    { label: 'Total Pengguna', value: totalUsers, icon: Users2, href: '/admin/users' },
    { label: 'Suara Masuk', value: ballots.length, icon: Vote, href: '/admin/results' },
  ]

  const activeEl = elections.find((e) => electionStatus(e) === 'active')
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    ballots.forEach((b) => { counts[b.candidate_id] = (counts[b.candidate_id] || 0) + 1 })
    return candidates.map((c) => ({
      name: c.label || c.name || c.user_name || c.initials || `#${c.id}`,
      suara: counts[c.id] || 0,
    }))
  }, [ballots, candidates])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Link key={i} href={s.href} className="group">
            <Card className="border-border/70 transition hover:border-gold/50 hover:shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-navy/5 border border-border flex items-center justify-center group-hover:bg-gold/10 transition">
                    <s.icon className="h-5 w-5 text-gold-dark" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-3xl font-serif text-navy">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ACTIVE ELECTION BANNER */}
      {activeEl && (
        <Card className="border-border/70 bg-navy text-white shadow-md">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                  Pemilihan Aktif
                </span>
              </div>
              <h3 className="font-serif text-xl">{activeEl.name}</h3>
              <p className="text-white/70 text-sm mt-1">Berakhir pada {fmtDate(activeEl.end_time)}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-4xl font-serif text-gold">
                  {ballots.filter((b) => String(b.election_id) === String(activeEl.id)).length}
                </div>
                <div className="text-white/60 text-sm">suara masuk</div>
              </div>
              <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-navy">
                <Link href="/admin/results">Lihat Hasil</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CHART PEROLEHAN SUARA */}
      <Card className="border-border/70">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h3 className="font-serif text-lg text-navy mb-1">Perolehan Suara Global</h3>
              <p className="text-sm text-muted-foreground">Jumlah suara masuk untuk setiap kandidat yang terdaftar.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-navy/20 text-navy hover:bg-navy/5">
              <Link href="/admin/results">Rekapitulasi Lengkap</Link>
            </Button>
          </div>

          {chartData.length === 0 || chartData.every((d) => d.suara === 0) ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed rounded-lg">
              Belum ada perolehan suara yang masuk.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="suara" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
