'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  apiFetch, electionStatus, STATUS_LABEL,
} from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Trophy } from 'lucide-react'
import { CHART_COLORS, statusBadge } from '@/components/admin/admin-shared'

export default function AdminResultsPage() {
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [ballots, setBallots] = useState<any[]>([])
  const [electionId, setElectionId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [eRes, cRes, bRes] = await Promise.all([
        apiFetch('/admin/elections').catch(() => apiFetch('/elections').catch(() => ({ data: [] }))),
        apiFetch('/candidates').catch(() => ({ data: [] })),
        apiFetch('/admin/ballots').catch(() => ({ data: [] })),
      ])
      const elList = Array.isArray(eRes?.data) ? eRes.data : []
      setElections(elList)
      setCandidates(Array.isArray(cRes?.data) ? cRes.data : [])
      setBallots(Array.isArray(bRes?.data) ? bRes.data : [])
      if (elList.length > 0 && !electionId) {
        setElectionId(String(elList[0].id))
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat hasil rekapitulasi suara')
    } finally {
      setLoading(false)
    }
  }

  const selEl = elections.find((e) => String(e.id) === electionId)
  const cands = candidates.filter((c) => (c.election_name || '').trim() === (selEl?.name || '').trim())
  const counts: Record<string, number> = {}
  ballots.forEach((b) => {
    if (!selEl || String(b.election_id) === String(selEl.id)) {
      counts[b.candidate_id] = (counts[b.candidate_id] || 0) + 1
    }
  })
  const total = cands.reduce((a, c) => a + (counts[c.id] || 0), 0)
  const ranked = [...cands].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
  const leader = ranked[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER CARD & ELECTION SELECTOR */}
      <Card className="border-border/70">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-serif text-lg text-navy">Rekapitulasi Suara</h2>
                {selEl && (
                  <Badge variant="outline" className={statusBadge[electionStatus(selEl)]}>
                    {STATUS_LABEL[electionStatus(selEl)]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Total <span className="font-semibold text-navy">{total}</span> suara sah untuk pemilihan terpilih.
              </p>
            </div>
            <div className="w-72">
              <Select value={electionId} onValueChange={setElectionId}>
                <SelectTrigger><SelectValue placeholder="Pilih agenda pemilihan" /></SelectTrigger>
                <SelectContent>
                  {elections.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WINNER / LEADER BANNER */}
      {leader && total > 0 && (
        <Card className="border-gold/40 bg-gold/5 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
              <Trophy className="h-7 w-7 text-gold-dark" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gold-dark font-semibold">
                Perolehan Suara Tertinggi
              </div>
              <div className="font-serif text-xl text-navy">
                {leader.user_name || leader.initials}
              </div>
              <div className="text-sm text-muted-foreground">
                {counts[leader.id] || 0} suara ({total ? Math.round(((counts[leader.id] || 0) / total) * 100) : 0}%)
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CANDIDATE VOTE PROGRESS BARS */}
      <Card className="border-border/70">
        <CardContent className="p-6 space-y-5">
          <h3 className="font-serif text-lg text-navy mb-4">Rincian Perolehan per Kandidat</h3>
          {cands.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg">
              Belum ada kandidat untuk agenda pemilihan ini.
            </div>
          ) : (
            ranked.map((c, i) => {
              const v = counts[c.id] || 0
              const pct = total ? Math.round((v / total) * 100) : 0
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-gold text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="font-medium text-navy">{c.user_name || c.initials}</span>
                      {c.batch_name && (
                        <span className="text-xs text-muted-foreground">({c.batch_name})</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {v} suara · {pct}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* REKAP TABEL */}
      {cands.length > 0 && (
        <Card className="border-border/70">
          <CardContent className="p-6">
            <h3 className="font-serif text-lg text-navy mb-4">Tabel Rekapitulasi Suara</h3>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peringkat</TableHead>
                    <TableHead>Kandidat</TableHead>
                    <TableHead>Angkatan</TableHead>
                    <TableHead className="text-right">Jumlah Suara</TableHead>
                    <TableHead className="text-right">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((c, i) => {
                    const v = counts[c.id] || 0
                    const pct = total ? ((v / total) * 100).toFixed(1) : '0.0'
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-semibold text-navy">#{i + 1}</TableCell>
                        <TableCell className="font-medium text-navy">{c.user_name || c.initials}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.batch_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-navy">{v}</TableCell>
                        <TableCell className="text-right font-medium text-gold-dark">{pct}%</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

