'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  apiFetch, getSession, clearToken, fmtDate, electionStatus, STATUS_LABEL,
  saveReceipt, getReceipts,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Vote, LogOut, Target, Flag, CheckCircle2, Loader2, ShieldCheck, Copy,
  CalendarClock, ArrowLeft, CheckCircle, Download, Timer,
} from 'lucide-react'
import Countdown from '@/components/Countdown'

const statusStyle = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  ended: 'bg-rose-100 text-rose-800 border-rose-200',
  complete: 'bg-blue-100 text-blue-800 border-blue-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function VotePage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [candidates, setCandidates] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [receipts, setReceipts] = useState({})
  const [successReceipt, setSuccessReceipt] = useState(null)

  useEffect(() => {
    const s = getSession()
    if (!s) {
      router.replace('/login')
      return
    }
    setSession(s)
    setReceipts(getReceipts())
    load()
  }, [router])

  const load = async () => {
    setLoading(true)
    try {
      const [el, ca] = await Promise.all([
        apiFetch('/elections'),
        apiFetch('/candidates').catch(() => ({ data: [] })),
      ])
      setElections(Array.isArray(el?.data) ? el.data : [])
      setCandidates(Array.isArray(ca?.data) ? ca.data : [])
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearToken()
    router.replace('/login')
  }

  const candidatesFor = (el) =>
    candidates.filter((c) => (c.election_name || '').trim() === (el?.name || '').trim())

  const openConfirm = (cand) => {
    setSelectedCandidate(cand)
    setConfirmOpen(true)
  }

  const castVote = async () => {
    if (!selectedElection || !selectedCandidate) return
    setSubmitting(true)
    try {
      const res = await apiFetch('/ballots', {
        method: 'POST',
        body: { election_id: Number(selectedElection.id), candidate_id: Number(selectedCandidate.id) },
      })
      const receipt = res?.data?.receipt_code || 'TERSIMPAN'
      saveReceipt(selectedElection.id, { code: receipt, candidate: selectedCandidate.user_name || selectedCandidate.initials, at: new Date().toISOString() })
      setReceipts(getReceipts())
      setConfirmOpen(false)
      setSuccessReceipt(receipt)
      toast.success('Suara Anda berhasil direkam')
    } catch (e) {
      toast.error(e.message || 'Gagal mengirim suara')
    } finally {
      setSubmitting(false)
    }
  }

  const copyReceipt = (code) => {
    navigator.clipboard?.writeText(code)
    toast.success('Kode receipt disalin')
  }

  const generateCertificate = async (code) => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const navy = [22, 30, 46]
      const gold = [201, 168, 106]
      const gray = [120, 120, 130]

      // Background + borders
      doc.setFillColor(252, 250, 246)
      doc.rect(0, 0, W, H, 'F')
      doc.setDrawColor(...navy)
      doc.setLineWidth(6)
      doc.rect(24, 24, W - 48, H - 48)
      doc.setDrawColor(...gold)
      doc.setLineWidth(1.5)
      doc.rect(34, 34, W - 68, H - 68)

      const cx = W / 2
      doc.setTextColor(...gold)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('IKATAN ALUMNI SMA UNGGULAN CT ARSA FOUNDATION', cx, 90, { align: 'center' })

      doc.setTextColor(...navy)
      doc.setFont('times', 'bold')
      doc.setFontSize(34)
      doc.text('SERTIFIKAT BUKTI SUARA', cx, 150, { align: 'center' })

      doc.setDrawColor(...gold)
      doc.setLineWidth(2)
      doc.line(cx - 90, 168, cx + 90, 168)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(13)
      doc.setTextColor(...gray)
      doc.text('Dengan ini menyatakan bahwa suara Anda telah berhasil direkam pada:', cx, 205, { align: 'center' })

      doc.setFont('times', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(...navy)
      doc.text(selectedElection?.name || 'Pemilihan Ketua Ikatan Alumni', cx, 240, { align: 'center', maxWidth: W - 160 })

      // Receipt box
      const boxW = 380, boxH = 84
      const boxX = cx - boxW / 2, boxY = 275
      doc.setFillColor(...navy)
      doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, 'F')
      doc.setTextColor(...gold)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('KODE RECEIPT', cx, boxY + 26, { align: 'center' })
      doc.setFont('courier', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(255, 255, 255)
      doc.text(String(code), cx, boxY + 58, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(...gray)
      const ts = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
      doc.text(`Waktu Pencatatan: ${ts}`, cx, 400, { align: 'center' })
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.text('Kode ini adalah bukti bahwa suara Anda tercatat. Kerahasiaan pilihan tetap terjaga.', cx, 420, { align: 'center' })

      doc.setDrawColor(...navy)
      doc.setLineWidth(0.8)
      doc.line(cx - 90, H - 80, cx + 90, H - 80)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...navy)
      doc.text('Panitia Pemilihan E-Voting', cx, H - 62, { align: 'center' })

      doc.save(`Sertifikat-Suara-${code}.pdf`)
      toast.success('Sertifikat PDF berhasil diunduh')
    } catch (e) {
      toast.error('Gagal membuat sertifikat: ' + e.message)
    }
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-navy text-white border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-8 md:h-9 w-auto object-contain" />
            <span className="hidden sm:inline-block h-5 w-px bg-white/20" />
            <span className="hidden sm:inline-block text-xs uppercase tracking-wider text-gold/90 font-medium">Bilik Suara</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-white/70">Pemilih Terverifikasi</span>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        {!selectedElection ? (
          <>
            <div className="mb-8">
              <h1 className="font-serif text-3xl text-navy mb-2">Selamat Datang, Pemilih.</h1>
              <p className="text-muted-foreground">Pilih pemilihan di bawah ini untuk memberikan suara Anda.</p>
            </div>
            {loading ? (
              <div className="grid md:grid-cols-2 gap-6"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
            ) : elections.length === 0 ? (
              <EmptyBox text="Belum ada pemilihan yang tersedia saat ini." />
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {elections.map((e) => {
                  const st = electionStatus(e)
                  const voted = receipts[e.id]
                  const count = candidatesFor(e).length
                  return (
                    <Card key={e.id} className="overflow-hidden border-border/70">
                      <div className="h-1.5 bg-gradient-to-r from-gold to-gold-dark" />
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-serif text-xl text-navy">{e.name}</h3>
                          <Badge variant="outline" className={statusStyle[st]}>{STATUS_LABEL[st]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{e.description || 'Pemilihan Ketua Ikatan Alumni.'}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Berakhir {fmtDate(e.end_time)}</span>
                          <span>{count} kandidat</span>
                        </div>
                        {(st === 'active' || st === 'upcoming') && (
                          <div className="mb-5 flex items-center gap-1.5 text-sm rounded-lg bg-secondary/70 border border-border px-3 py-2">
                            <Timer className="h-4 w-4 text-gold-dark shrink-0" />
                            <span className="text-muted-foreground">{st === 'active' ? 'Berakhir dalam' : 'Dibuka dalam'}</span>
                            <Countdown target={st === 'active' ? e.end_time : e.start_time} className="font-semibold text-navy" endedText="Segera diperbarui" />
                          </div>
                        )}
                        {voted ? (
                          <Button disabled className="w-full bg-emerald-600 hover:bg-emerald-600 text-white opacity-90">
                            <CheckCircle className="h-4 w-4 mr-2" /> Anda Sudah Memilih
                          </Button>
                        ) : st === 'active' ? (
                          <Button className="w-full bg-navy hover:bg-navy-light text-white" onClick={() => setSelectedElection(e)}>
                            Beri Suara <Vote className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button disabled variant="secondary" className="w-full">
                            {st === 'upcoming' ? 'Belum Dibuka' : st === 'complete' ? 'Pemilihan Selesai' : 'Waktu Habis (Ditutup)'}
                          </Button>
                        )}
                        {voted && (
                          <p className="mt-3 text-xs text-center text-muted-foreground">
                            Receipt: <button onClick={() => copyReceipt(voted.code)} className="font-mono text-gold-dark hover:underline">{voted.code}</button>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => { setSelectedElection(null); setSelectedCandidate(null) }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy mb-6">
              <ArrowLeft className="h-4 w-4" /> Kembali ke daftar pemilihan
            </button>
            <div className="mb-8">
              <Badge variant="outline" className="mb-3 bg-navy/5 text-navy border-navy/20">{selectedElection.name}</Badge>
              <h1 className="font-serif text-3xl text-navy mb-2">Pilih Kandidat Anda</h1>
              <p className="text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold-dark" /> Pilihan Anda bersifat rahasia dan hanya dapat dilakukan satu kali.</p>
              <div className="mt-5">
                <div className="text-xs uppercase tracking-wider text-gold-dark font-semibold mb-2">Sisa Waktu Pemilihan</div>
                <Countdown target={selectedElection.end_time} variant="blocks" endedText="Pemilihan telah ditutup" />
              </div>
            </div>
            {(() => {
              const list = candidatesFor(selectedElection)
              if (list.length === 0) return <EmptyBox text="Belum ada kandidat untuk pemilihan ini." />
              return (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {list.map((c) => (
                    <Card key={c.id} className="border-border/70 flex flex-col">
                      <CardContent className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-4 mb-5">
                          <div className="h-16 w-16 rounded-full bg-navy text-gold flex items-center justify-center font-serif text-xl border-2 border-gold/40">
                            {(c.initials || c.user_name || '?').toString().slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-serif text-lg text-navy truncate">{c.user_name || c.initials}</h3>
                            {c.batch_name && <div className="text-xs text-muted-foreground">Angkatan {c.batch_name}</div>}
                          </div>
                        </div>
                        <div className="space-y-3 text-sm flex-1">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy mb-1"><Target className="h-3.5 w-3.5 text-gold-dark" /> Visi</div>
                            <p className="text-muted-foreground line-clamp-3">{c.vision || '-'}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy mb-1"><Flag className="h-3.5 w-3.5 text-gold-dark" /> Misi</div>
                            <p className="text-muted-foreground line-clamp-3">{c.mission || '-'}</p>
                          </div>
                        </div>
                        <Button className="mt-5 w-full bg-navy hover:bg-navy-light text-white" onClick={() => openConfirm(c)}>
                          Pilih Kandidat Ini
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            })()}
          </>
        )}
      </main>

      {/* CONFIRM DIALOG */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-navy">Konfirmasi Pilihan</DialogTitle>
            <DialogDescription>
              Anda akan memberikan suara untuk <span className="font-semibold text-navy">{selectedCandidate?.user_name || selectedCandidate?.initials}</span> pada pemilihan <span className="font-semibold text-navy">{selectedElection?.name}</span>. Pilihan tidak dapat diubah setelah dikirim.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Batal</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={castVote} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim...</> : <>Kirim Suara <CheckCircle2 className="h-4 w-4 ml-2" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUCCESS DIALOG */}
      <Dialog open={!!successReceipt} onOpenChange={(o) => { if (!o) { setSuccessReceipt(null); setSelectedElection(null); setSelectedCandidate(null) } }}>
        <DialogContent className="text-center">
          <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-navy text-center">Suara Berhasil Direkam!</DialogTitle>
            <DialogDescription className="text-center">Terima kasih telah berpartisipasi. Simpan kode bukti (receipt) Anda di bawah ini.</DialogDescription>
          </DialogHeader>
          <div className="my-2 rounded-xl border-2 border-dashed border-gold/40 bg-gold/5 p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Kode Receipt</div>
            <div className="font-mono text-xl font-bold text-navy break-all">{successReceipt}</div>
            <Button variant="ghost" size="sm" className="mt-2 text-gold-dark hover:text-gold-dark" onClick={() => copyReceipt(successReceipt)}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Salin Kode
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button className="bg-gold hover:bg-gold-dark text-navy font-semibold" onClick={() => generateCertificate(successReceipt)}>
              <Download className="h-4 w-4 mr-2" /> Unduh Sertifikat (PDF)
            </Button>
            <Button variant="outline" className="border-navy/20 text-navy hover:bg-navy/5" onClick={() => { setSuccessReceipt(null); setSelectedElection(null); setSelectedCandidate(null) }}>
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyBox({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 px-6 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
        <CalendarClock className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">{text}</p>
    </div>
  )
}
