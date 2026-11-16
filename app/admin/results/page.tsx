'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  apiFetch, electionStatus, STATUS_LABEL, fmtDate,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Trophy, HelpCircle, Users, Scale, BarChart3, Info, MessageSquare,
  Copy, Download, Trash2, ShieldCheck, Check,
} from 'lucide-react'
import { CHART_COLORS, statusBadge } from '@/components/admin/admin-shared'

export default function AdminResultsPage() {
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [ballots, setBallots] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [electionId, setElectionId] = useState('')
  const [calcMode, setCalcMode] = useState<'individual' | 'batch_weighted'>('batch_weighted')

  // Multi-Question state
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('ALL')

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [eRes, cRes, bRes, batchRes] = await Promise.all([
        apiFetch('/admin/elections').catch(() => apiFetch('/elections').catch(() => ({ data: [] }))),
        apiFetch('/candidates').catch(() => ({ data: [] })),
        apiFetch('/admin/ballots').catch(() => ({ data: [] })),
        apiFetch('/admin/batches').catch(() => ({ data: [] })),
      ])
      const elList = Array.isArray(eRes?.data) ? eRes.data : []
      setElections(elList)
      setCandidates(Array.isArray(cRes?.data) ? cRes.data : [])
      setBallots(Array.isArray(bRes?.data) ? bRes.data : [])
      setBatches(Array.isArray(batchRes?.data) ? batchRes.data : [])
      if (elList.length > 0 && !electionId) {
        setElectionId(String(elList[0].id))
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat hasil rekapitulasi suara')
    } finally {
      setLoading(false)
    }
  }

  // Load feedbacks whenever active election changes
  useEffect(() => {
    if (!electionId) return
    loadFeedbacks(electionId)
  }, [electionId])

  // Reset selected question to ALL or first question when election changes
  useEffect(() => {
    setSelectedQuestionId('ALL')
  }, [electionId])

  const loadFeedbacks = async (elId: string) => {
    setLoadingFeedbacks(true)
    try {
      const res = await apiFetch(`/admin/elections/${elId}/feedbacks`).catch(() => ({ data: [] }))
      setFeedbacks(Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to load feedbacks:', err)
      setFeedbacks([])
    } finally {
      setLoadingFeedbacks(false)
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!window.confirm('Hapus pesan kritik / saran ini?')) return
    setDeletingFeedbackId(id)
    try {
      await apiFetch(`/admin/feedback/${id}`, { method: 'DELETE' })
      toast.success('Pesan kritik/saran berhasil dihapus')
      setFeedbacks((prev) => prev.filter((f) => String(f.id) !== String(id)))
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus kritik/saran')
    } finally {
      setDeletingFeedbackId(null)
    }
  }

  const exportFeedbacksTxt = () => {
    if (feedbacks.length === 0) return
    const elName = selEl?.name || 'Pemilihan'
    let content = `KOTAK ASPIRASI: KRITIK & SARAN ANONIM\nSesi Pemilihan: ${elName}\nDiunduh pada: ${new Date().toLocaleString('id-ID')}\nTotal Masukan: ${feedbacks.length}\n${'='.repeat(60)}\n\n`
    feedbacks.forEach((f, idx) => {
      content += `[#${idx + 1}] Waktu: ${fmtDate(f.created_at)}\n${f.content}\n\n${'-'.repeat(40)}\n\n`
    })

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Aspirasi-Anonim-${elName.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File aspirasi .txt berhasil diunduh')
  }

  const selEl = elections.find((e) => String(e.id) === electionId)
  const electionQuestions: any[] = selEl?.questions || []

  // All candidates for selected election
  const allElectionCands = candidates.filter((c) =>
    (selEl?.id && String(c.id_election) === String(selEl.id)) ||
    (c.election_name || '').trim() === (selEl?.name || '').trim()
  )

  // Filter candidates based on selected question tab
  const cands = useMemo(() => {
    if (selectedQuestionId === 'ALL') {
      return allElectionCands
    }
    return allElectionCands.filter((c) => String(c.id_question) === String(selectedQuestionId))
  }, [allElectionCands, selectedQuestionId])

  // Filter ballots untuk sesi pemilihan terpilih
  const elBallots = useMemo(() => {
    let list = ballots.filter((b) => !selEl || String(b.election_id) === String(selEl.id))
    if (selectedQuestionId !== 'ALL') {
      list = list.filter((b) => String(b.question_id) === String(selectedQuestionId))
    }
    return list
  }, [ballots, selEl, selectedQuestionId])

  const totalIndividualVotes = elBallots.length

  // 1. Perhitungan One-Man-One-Vote (Suara Individu)
  const individualCounts: Record<string, number> = {}
  elBallots.forEach((b) => {
    if (b.candidate_id) {
      individualCounts[b.candidate_id] = (individualCounts[b.candidate_id] || 0) + 1
    }
  })

  // 2. Perhitungan Proporsional Angkatan (Persentase per Angkatan)
  const batchBreakdownMap: Record<string, {
    batchId: string
    batchName: string
    batchNumber?: number
    batchBranch?: string
    totalVotes: number
    candVotes: Record<string, number>
    candPercent: Record<string, number>
    candPoints: Record<string, number>
  }> = {}

  elBallots.forEach((b) => {
    const bId = b.batch_id || (b.batch && b.batch.id) || 'unknown'
    if (!batchBreakdownMap[bId]) {
      const foundBatch = batches.find((item) => String(item.id) === String(bId)) || b.batch
      batchBreakdownMap[bId] = {
        batchId: bId,
        batchName: foundBatch ? foundBatch.name : (bId === 'unknown' ? 'Tanpa Angkatan' : `Angkatan #${bId}`),
        batchNumber: foundBatch?.number,
        batchBranch: foundBatch?.branch,
        totalVotes: 0,
        candVotes: {},
        candPercent: {},
        candPoints: {},
      }
    }
    batchBreakdownMap[bId].totalVotes += 1
    if (b.candidate_id) {
      batchBreakdownMap[bId].candVotes[b.candidate_id] = (batchBreakdownMap[bId].candVotes[b.candidate_id] || 0) + 1
    }
  })

  const participatingBatchList = Object.values(batchBreakdownMap).sort((a, b) => {
    if (a.batchNumber && b.batchNumber) return a.batchNumber - b.batchNumber
    return a.batchName.localeCompare(b.batchName)
  })

  const batchWeightedPoints: Record<string, number> = {}
  cands.forEach((c) => {
    batchWeightedPoints[c.id] = 0
  })

  participatingBatchList.forEach((bItem) => {
    if (bItem.totalVotes > 0) {
      cands.forEach((c) => {
        const v = bItem.candVotes[c.id] || 0
        const pct = (v / bItem.totalVotes) * 100
        bItem.candPercent[c.id] = pct
        bItem.candPoints[c.id] = pct
        batchWeightedPoints[c.id] = (batchWeightedPoints[c.id] || 0) + pct
      })
    }
  })

  const totalWeightedPoints = participatingBatchList.length * 100
  const isWeighted = calcMode === 'batch_weighted'
  const activeTotal = isWeighted ? totalWeightedPoints : totalIndividualVotes

  // Pengurutan peringkat berdasarkan mode yang sedang aktif
  const ranked = [...cands].sort((a, b) => {
    const scoreA = isWeighted ? (batchWeightedPoints[a.id] || 0) : (individualCounts[a.id] || 0)
    const scoreB = isWeighted ? (batchWeightedPoints[b.id] || 0) : (individualCounts[b.id] || 0)
    return scoreB - scoreA
  })
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
                <h2 className="font-serif text-xl text-navy">Rekapitulasi Hasil Suara</h2>
                {selEl && (
                  <Badge variant="outline" className={statusBadge[electionStatus(selEl)]}>
                    {STATUS_LABEL[electionStatus(selEl)]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Total <span className="font-semibold text-navy">{totalIndividualVotes}</span> suara sah dari{' '}
                <span className="font-semibold text-navy">{participatingBatchList.length}</span> angkatan yang berpartisipasi.
              </p>
            </div>
            <div className="w-80">
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

          {/* VIEW MODE TOGGLE PILL */}
          <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Metode Perhitungan Rekapitulasi:
              </span>
              <div className="inline-flex rounded-lg border border-border p-1 bg-secondary/50">
                <button
                  type="button"
                  onClick={() => setCalcMode('batch_weighted')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                    isWeighted
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-muted-foreground hover:text-navy'
                  )}
                >
                  <Scale className="h-3.5 w-3.5" />
                  Proporsional Angkatan (% per Angkatan)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('individual')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                    !isWeighted
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-muted-foreground hover:text-navy'
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  One-Man-One-Vote (Suara Individu)
                </button>
              </div>
            </div>

            <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 px-3 py-2 rounded-lg flex items-start gap-2 max-w-md">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              {isWeighted ? (
                <div>
                  <strong>Mode Proporsional Angkatan:</strong> Setiap angkatan menyumbangkan <strong>100 suara (poin)</strong>. Persentase perolehan dalam angkatan menjadi suara riil (60% = 60 suara).
                </div>
              ) : (
                <div>
                  <strong>Mode One-Man-One-Vote:</strong> Setiap suara pemilih dihitung murni sebagai 1 suara tanpa memandang asal angkatan.
                </div>
              )}
            </div>
          </div>

          {/* QUESTION FILTER TABS (WHEN MULTIPLE QUESTIONS EXIST) */}
          {electionQuestions.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-dark">
                  Pilih Pertanyaan / Agenda Voting:
                </span>
                <span className="text-xs text-muted-foreground">
                  {electionQuestions.length} Pertanyaan terdaftar
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestionId('ALL')}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border font-medium transition-all',
                    selectedQuestionId === 'ALL'
                      ? 'bg-navy text-white border-navy shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                  )}
                >
                  Semua Opsi Suara
                </button>
                {electionQuestions.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setSelectedQuestionId(String(q.id))}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5',
                      selectedQuestionId === String(q.id)
                        ? 'bg-navy text-white border-navy shadow-sm'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                    )}
                  >
                    <span>#{idx + 1}.</span>
                    <span className="max-w-[200px] truncate">{q.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WINNER / LEADER BANNER */}
      {leader && activeTotal > 0 && (
        <Card className="border-gold/40 bg-gold/5 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
              <Trophy className="h-7 w-7 text-gold-dark" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gold-dark font-semibold">
                Pilihan dengan Suara Tertinggi ({isWeighted ? 'Proporsional Angkatan' : 'One-Man-One-Vote'})
              </div>
              <div className="font-serif text-xl font-bold text-navy">
                {leader.label || leader.name || leader.user_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {isWeighted ? (
                  <>
                    <strong className="text-navy">{(batchWeightedPoints[leader.id] || 0).toFixed(1)} suara</strong>{' '}
                    ({totalWeightedPoints ? (((batchWeightedPoints[leader.id] || 0) / totalWeightedPoints) * 100).toFixed(1) : 0}% dari {totalWeightedPoints} total suara angkatan)
                    <span className="text-xs ml-2 text-muted-foreground">
                      • {individualCounts[leader.id] || 0} suara pemilih sah
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="text-navy">{individualCounts[leader.id] || 0} suara</strong>{' '}
                    ({totalIndividualVotes ? (((individualCounts[leader.id] || 0) / totalIndividualVotes) * 100).toFixed(1) : 0}%)
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CANDIDATE / OPTION VOTE PROGRESS BARS */}
      <Card className="border-border/70">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-navy">
              Rincian Perolehan per Pilihan ({isWeighted ? 'Proporsional per Angkatan' : 'One-Man-One-Vote'})
            </h3>
            <span className="text-xs text-muted-foreground">
              {isWeighted
                ? `Total Bobot: ${totalWeightedPoints} Suara (${participatingBatchList.length} Angkatan × 100)`
                : `Total: ${totalIndividualVotes} Suara Pemilih`}
            </span>
          </div>

          {cands.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg">
              Belum ada opsi pilihan yang terdaftar pada filter pertanyaan ini.
            </div>
          ) : (
            ranked.map((c, i) => {
              const val = isWeighted ? (batchWeightedPoints[c.id] || 0) : (individualCounts[c.id] || 0)
              const pct = activeTotal ? Number(((val / activeTotal) * 100).toFixed(1)) : 0
              const label = c.label || c.name || c.user_name || 'Pilihan'

              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-gold text-xs font-semibold shrink-0">
                        {c.order_number || i + 1}
                      </span>
                      {c.image_url && (
                        <img
                          src={c.image_url}
                          alt={label}
                          className="h-6 w-6 rounded object-cover border border-border shrink-0"
                          onError={(ev: any) => { ev.target.style.display = 'none' }}
                        />
                      )}
                      <div>
                        <span className="font-medium text-navy">{label}</span>
                        {c.question_title && selectedQuestionId === 'ALL' && (
                          <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            {c.question_title}
                          </span>
                        )}
                        {c.user_name && c.user_name !== label && (
                          <span className="text-xs text-muted-foreground ml-1">({c.user_name})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-navy font-bold">
                        {isWeighted ? `${val.toFixed(1)} suara` : `${val} suara`} · {pct}%
                      </span>
                      {isWeighted && (
                        <span className="text-xs text-muted-foreground block">
                          ({individualCounts[c.id] || 0} suara pemilih riil)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-3.5 rounded-full bg-secondary overflow-hidden">
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

      {/* TABEL REKAPITULASI HASIL AKUMULASI */}
      {cands.length > 0 && (
        <Card className="border-border/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg text-navy">Tabel Rekapitulasi Suara</h3>
                <p className="text-xs text-muted-foreground">
                  Perbandingan perolehan suara berdasarkan mode perhitungan yang dipilih.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Pilihan / Opsi</TableHead>
                    {selectedQuestionId === 'ALL' && <TableHead>Pertanyaan Terkait</TableHead>}
                    <TableHead>Akun Terkait</TableHead>
                    <TableHead className="text-right">Suara Individu</TableHead>
                    <TableHead className="text-right">Suara Proporsional</TableHead>
                    <TableHead className="text-right">Persentase Aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((c, i) => {
                    const rawV = individualCounts[c.id] || 0
                    const weightedV = batchWeightedPoints[c.id] || 0
                    const activeVal = isWeighted ? weightedV : rawV
                    const pct = activeTotal ? ((activeVal / activeTotal) * 100).toFixed(1) : '0.0'
                    const label = c.label || c.name || c.user_name || 'Pilihan'

                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-semibold text-navy">{c.order_number || i + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium text-navy">{label}</div>
                          {c.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                          )}
                        </TableCell>
                        {selectedQuestionId === 'ALL' && (
                          <TableCell className="text-xs text-slate-700">
                            {c.question_title || 'Pertanyaan Utama'}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">{c.user_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-navy">
                          {rawV}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({totalIndividualVotes ? ((rawV / totalIndividualVotes) * 100).toFixed(1) : 0}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-navy">
                          {weightedV.toFixed(1)} suara
                          <span className="text-xs text-muted-foreground ml-1">
                            ({totalWeightedPoints ? ((weightedV / totalWeightedPoints) * 100).toFixed(1) : 0}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-gold-dark">{pct}%</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABEL MATRIKS DISTRIBUSI SUARA PER ANGKATAN */}
      <Card className="border-border/70">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-navy flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gold-dark" /> Matriks Distribusi Suara per Angkatan
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rincian suara riil dan perolehan persentase (poin suara) yang disumbangkan oleh setiap angkatan (100 suara per angkatan).
              </p>
            </div>
          </div>

          {participatingBatchList.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              Belum ada data pemilih yang memberikan suara untuk agenda pemilihan ini.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Angkatan</TableHead>
                    <TableHead className="text-center">Pemilih Riil</TableHead>
                    {cands.map((c) => (
                      <TableHead key={c.id} className="text-right min-w-[150px]">
                        {c.label || c.name || 'Opsi'}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold">Total Suara Angkatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participatingBatchList.map((bItem, bIdx) => {
                    return (
                      <TableRow key={bItem.batchId}>
                        <TableCell className="font-semibold text-muted-foreground">{bIdx + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-navy">
                            {bItem.batchName} {bItem.batchNumber ? `(No. ${bItem.batchNumber})` : ''}
                          </div>
                          {bItem.batchBranch && (
                            <div className="text-xs text-muted-foreground">{bItem.batchBranch}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-secondary text-xs font-semibold text-navy">
                            {bItem.totalVotes} pemilih
                          </span>
                        </TableCell>
                        {cands.map((c) => {
                          const v = bItem.candVotes[c.id] || 0
                          const pct = bItem.candPercent[c.id] || 0
                          return (
                            <TableCell key={c.id} className="text-right">
                              <div className="font-semibold text-navy">
                                {pct.toFixed(1)} suara
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {v} pemilih ({pct.toFixed(1)}%)
                              </div>
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-right font-bold text-navy">
                          100.0 suara
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* FOOTER ROW TOTAL AKUMULASI */}
                  <TableRow className="bg-secondary/40 font-bold border-t-2 border-border">
                    <TableCell colSpan={2} className="text-navy font-bold">
                      TOTAL AKUMULASI SELURUH ANGKATAN
                    </TableCell>
                    <TableCell className="text-center text-navy font-bold">
                      {totalIndividualVotes} pemilih
                    </TableCell>
                    {cands.map((c) => {
                      const pts = batchWeightedPoints[c.id] || 0
                      const pct = totalWeightedPoints ? ((pts / totalWeightedPoints) * 100).toFixed(1) : '0.0'
                      return (
                        <TableCell key={c.id} className="text-right">
                          <div className="text-navy font-bold">{pts.toFixed(1)} suara</div>
                          <div className="text-xs text-gold-dark font-semibold">({pct}%)</div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right text-navy font-bold">
                      {totalWeightedPoints}.0 suara
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KOTAK ASPIRASI: KRITIK & SARAN ANONIM */}
      <Card className="border-border/70 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg text-navy flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" /> Kotak Aspirasi: Kritik & Saran Anonim
                </h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" /> 100% Anonim
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Masukan, evaluasi, dan aspirasi yang disampaikan pemilih secara terisolasi tanpa mencatat identitas akun alumni.
              </p>
            </div>
            {feedbacks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportFeedbacksTxt}
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Unduh Dokumen Aspirasi (.txt)
              </Button>
            )}
          </div>

          {loadingFeedbacks ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-secondary/20">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              {selEl?.enable_feedback
                ? 'Belum ada kritik & saran yang dikirimkan pemilih pada sesi ini.'
                : 'Section kritik & saran tidak diaktifkan pada pengaturan sesi pemilihan ini.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {feedbacks.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start justify-between gap-3"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(f.created_at)}
                      </span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                        Anonim
                      </span>
                    </div>
                    <p className="text-sm text-navy leading-relaxed whitespace-pre-wrap">
                      {f.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(f.content)
                        toast.success('Pesan disalin ke clipboard')
                      }}
                      className="h-8 text-xs text-muted-foreground hover:text-navy"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Salin
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingFeedbackId === f.id}
                      onClick={() => deleteFeedback(f.id)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
