'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  apiFetch, getSession, clearToken, fmtDate, electionStatus, STATUS_LABEL,
  saveReceipt, getReceipts, UserSession,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Vote, LogOut, CheckCircle2, Loader2, ShieldCheck, Copy,
  CalendarClock, ArrowLeft, CheckCircle, Download, Timer, GraduationCap, Check,
  MessageSquare, ChevronRight, ChevronLeft, AlertCircle, HelpCircle,
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
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [receipts, setReceipts] = useState<Record<string, any>>({})

  // Active voting state
  const [selectedElection, setSelectedElection] = useState<any>(null)
  const [electionQuestions, setElectionQuestions] = useState<any[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [activeStep, setActiveStep] = useState(0) // 0..N-1: Questions, N: Feedback (if enabled), N+1: Review
  const [answers, setAnswers] = useState<Record<string, string>>({}) // question_id -> candidate_id
  const [feedbackText, setFeedbackText] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successReceipt, setSuccessReceipt] = useState<any>(null)

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
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearToken()
    router.replace('/login')
  }

  // Open Bilik Suara for an election
  const enterBooth = async (e: any) => {
    setSelectedElection(e)
    setLoadingQuestions(true)
    setActiveStep(0)
    setAnswers({})
    setFeedbackText('')

    try {
      // Fetch specific questions for this election
      const qRes = await apiFetch(`/elections/${e.id}/questions`).catch(() => null)
      let qs: any[] = []
      if (Array.isArray(qRes?.data) && qRes.data.length > 0) {
        qs = qRes.data
      } else if (Array.isArray(e.questions) && e.questions.length > 0) {
        qs = e.questions
      } else {
        // Fallback default question
        qs = [{
          id: 'default',
          title: e.question || e.name,
          description: e.description || '',
          order_number: 1,
          is_required: true,
        }]
      }
      setElectionQuestions(qs)
    } catch (err: any) {
      console.error('Failed to load questions:', err)
      setElectionQuestions([{
        id: 'default',
        title: e.question || e.name,
        description: e.description || '',
        order_number: 1,
        is_required: true,
      }])
    } finally {
      setLoadingQuestions(false)
    }
  }

  // Helper: Get candidates for a given question
  const getCandidatesForQuestion = (q: any) => {
    if (!selectedElection) return []

    // 1. Try candidates matched by id_question
    if (q.id && q.id !== 'default') {
      const matched = candidates.filter((c) => String(c.id_question) === String(q.id))
      if (matched.length > 0) return matched
    }

    // 2. Try candidates inside question object
    if (Array.isArray(q.candidates) && q.candidates.length > 0) {
      return q.candidates
    }

    // 3. Fallback to all candidates belonging to the election
    return candidates.filter((c) =>
      (selectedElection.id && String(c.id_election) === String(selectedElection.id)) ||
      (c.election_name || '').trim() === (selectedElection.name || '').trim()
    )
  }

  const numQuestions = electionQuestions.length
  const hasFeedbackStep = Boolean(selectedElection?.enable_feedback)
  const feedbackStepIndex = numQuestions
  const reviewStepIndex = numQuestions + (hasFeedbackStep ? 1 : 0)
  const totalSteps = reviewStepIndex + 1

  const currentQuestion = activeStep < numQuestions ? electionQuestions[activeStep] : null
  const isFeedbackStep = hasFeedbackStep && activeStep === feedbackStepIndex
  const isReviewStep = activeStep === reviewStepIndex

  // Validate if user can proceed from current question
  const canProceedFromQuestion = () => {
    if (!currentQuestion) return true
    if (!currentQuestion.is_required) return true
    return Boolean(answers[currentQuestion.id])
  }

  const handleNext = () => {
    if (activeStep < numQuestions) {
      if (currentQuestion?.is_required && !answers[currentQuestion.id]) {
        toast.error('Harap pilih salah satu opsi jawaban sebelum melanjutkan')
        return
      }
    }
    if (activeStep < reviewStepIndex) {
      setActiveStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const castVote = async () => {
    if (!selectedElection) return
    setSubmitting(true)
    try {
      // Build votes array per question
      const voteItems = electionQuestions.map((q) => {
        const candId = answers[q.id]
        return {
          question_id: q.id !== 'default' ? String(q.id) : '',
          candidate_id: candId ? String(candId) : '',
        }
      }).filter((item) => item.candidate_id !== '')

      // Backward compatibility: If single vote without question_id
      const bodyPayload: any = {
        election_id: String(selectedElection.id),
        votes: voteItems,
        feedback: feedbackText.trim(),
      }

      // If only one vote was cast, also provide candidate_id for legacy endpoints
      if (voteItems.length === 1) {
        bodyPayload.candidate_id = voteItems[0].candidate_id
      }

      const res = await apiFetch('/ballots', {
        method: 'POST',
        body: bodyPayload,
      })

      const receipt = res?.data?.receipt_code || 'BLT-TERSIMPAN'
      saveReceipt(selectedElection.id, {
        code: receipt,
        election_name: selectedElection.name,
        at: new Date().toISOString(),
      })

      setReceipts(getReceipts())
      setConfirmOpen(false)
      setSuccessReceipt(receipt)
      toast.success('Seluruh pilihan suara Anda berhasil direkam secara aman')
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengirim suara')
    } finally {
      setSubmitting(false)
    }
  }

  const copyReceipt = (code: string) => {
    navigator.clipboard?.writeText(code)
    toast.success('Kode receipt disalin')
  }

  const generateCertificate = async (code: string) => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const navy: [number, number, number] = [22, 30, 46]
      const gold: [number, number, number] = [201, 168, 106]
      const gray: [number, number, number] = [120, 120, 130]

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
      doc.setFontSize(32)
      doc.text('BUKTI REKAM SUARA RESMI', cx, 145, { align: 'center' })

      doc.setDrawColor(...gold)
      doc.setLineWidth(2)
      doc.line(cx - 90, 162, cx + 90, 162)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(13)
      doc.setTextColor(...gray)
      doc.text('Dengan ini menyatakan bahwa hak suara Anda telah berhasil dicatat pada:', cx, 195, { align: 'center' })

      doc.setFont('times', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(...navy)
      doc.text(selectedElection?.name || 'Sesi Voting IKA SMAUCTAF', cx, 225, { align: 'center', maxWidth: W - 160 })

      // Receipt box
      const boxW = 380, boxH = 84
      const boxX = cx - boxW / 2, boxY = 260
      doc.setFillColor(...navy)
      doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, 'F')
      doc.setTextColor(...gold)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('KODE RECEIPT ENKRIPSI', cx, boxY + 26, { align: 'center' })
      doc.setFont('courier', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text(String(code), cx, boxY + 58, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(...gray)
      const ts = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
      doc.text(`Waktu Pencatatan: ${ts}`, cx, 380, { align: 'center' })
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.text('Kode ini membuktikan partisipasi suara Anda tanpa membocorkan isi pilihan (100% Rahasia & Anonim).', cx, 400, { align: 'center' })

      doc.setDrawColor(...navy)
      doc.setLineWidth(0.8)
      doc.line(cx - 90, H - 80, cx + 90, H - 80)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...navy)
      doc.text('Panitia Pemilihan & Voting E-Voting', cx, H - 62, { align: 'center' })

      doc.save(`Sertifikat-Suara-${code}.pdf`)
      toast.success('Sertifikat PDF berhasil diunduh')
    } catch (e: any) {
      toast.error('Gagal membuat sertifikat: ' + e.message)
    }
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-navy text-white border-b border-white/10 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-8 md:h-9 w-auto object-contain" />
            <span className="hidden sm:inline-block h-5 w-px bg-white/20" />
            <span className="hidden sm:inline-block text-xs uppercase tracking-wider text-gold/90 font-medium">Bilik Suara</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white leading-tight">{session.name || 'Pemilih'}</div>
              {session.batchName ? (
                <div className="text-[11px] text-gold/90 flex items-center justify-end gap-1 font-medium mt-0.5">
                  <GraduationCap className="h-3 w-3" />
                  <span>{session.batchNumber ? `Angkatan ${session.batchNumber} - ` : ''}{session.batchName}{session.batchBranch ? ` (${session.batchBranch})` : ''}</span>
                </div>
              ) : (
                <div className="text-[11px] text-white/60">Pemilih Terverifikasi</div>
              )}
            </div>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {!selectedElection ? (
          <>
            <div className="mb-8">
              <h1 className="font-serif text-3xl text-navy mb-2">
                Selamat Datang, {session.name || 'Pemilih'}.
              </h1>
              <p className="text-muted-foreground">
                {session.batchName ? (
                  <span>
                    Anda terdaftar sebagai alumni <strong className="text-navy">Angkatan {session.batchNumber ? `${session.batchNumber} - ` : ''}{session.batchName}{session.batchBranch ? ` (${session.batchBranch})` : ''}</strong>. Silakan pilih sesi voting di bawah ini untuk berpartisipasi.
                  </span>
                ) : (
                  <span>Pilih sesi voting di bawah ini untuk memberikan suara Anda.</span>
                )}
              </p>
            </div>
            {loading ? (
              <div className="grid md:grid-cols-2 gap-6"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
            ) : elections.length === 0 ? (
              <EmptyBox text="Belum ada sesi voting atau pemilihan yang aktif saat ini." />
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {elections.map((e) => {
                  const st = electionStatus(e)
                  const voted = receipts[e.id]
                  const qCount = e.questions?.length || 1

                  return (
                    <Card key={e.id} className="overflow-hidden border-border/70 flex flex-col justify-between hover:border-gold/50 transition">
                      <div>
                        <div className="h-1.5 bg-gradient-to-r from-gold to-gold-dark" />
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-serif text-xl text-navy">{e.name}</h3>
                            <Badge variant="outline" className={statusStyle[st]}>{STATUS_LABEL[st]}</Badge>
                          </div>

                          {/* Pertanyaan preview */}
                          {e.question && (
                            <div className="mb-3 text-sm text-navy/90 font-medium bg-secondary/50 p-2.5 rounded-lg border border-border/60">
                              <span className="text-xs text-gold-dark uppercase tracking-wide font-bold block mb-0.5">Pertanyaan Utama:</span>
                              {e.question}
                            </div>
                          )}

                          {e.description && (
                            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{e.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
                            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Berakhir {fmtDate(e.end_time)}</span>
                            <span>•</span>
                            <span className="font-medium text-navy">{qCount} Pertanyaan</span>
                            {e.enable_feedback && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <MessageSquare className="h-3 w-3" /> Ada Kotak Aspirasi
                                </span>
                              </>
                            )}
                          </div>

                          {(st === 'active' || st === 'upcoming') && (
                            <div className="mb-4 flex items-center gap-1.5 text-sm rounded-lg bg-secondary/70 border border-border px-3 py-2">
                              <Timer className="h-4 w-4 text-gold-dark shrink-0" />
                              <span className="text-muted-foreground">{st === 'active' ? 'Berakhir dalam' : 'Dibuka dalam'}</span>
                              <Countdown target={st === 'active' ? e.end_time : e.start_time} className="font-semibold text-navy" endedText="Segera diperbarui" />
                            </div>
                          )}
                        </CardContent>
                      </div>

                      <div className="px-6 pb-6">
                        {voted ? (
                          <div>
                            <Button disabled className="w-full bg-emerald-600 hover:bg-emerald-600 text-white opacity-90">
                              <CheckCircle className="h-4 w-4 mr-2" /> Anda Sudah Memilih
                            </Button>
                            <p className="mt-2 text-xs text-center text-muted-foreground">
                              Receipt: <button onClick={() => copyReceipt(voted.code)} className="font-mono text-gold-dark hover:underline font-semibold">{voted.code}</button>
                            </p>
                          </div>
                        ) : st === 'active' ? (
                          <Button className="w-full bg-navy hover:bg-navy-light text-white" onClick={() => enterBooth(e)}>
                            Masuk Bilik Suara <Vote className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button disabled variant="secondary" className="w-full">
                            {st === 'upcoming' ? 'Belum Dibuka' : st === 'complete' ? 'Voting Telah Selesai' : 'Waktu Habis (Ditutup)'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* BOOTH NAVIGATION HEADER */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={() => { setSelectedElection(null); setElectionQuestions([]) }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy transition"
              >
                <ArrowLeft className="h-4 w-4" /> Keluar dari Bilik Suara
              </button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Enkripsi 100% Rahasia & Anonim</span>
              </div>
            </div>

            {/* PROGRESS STEPPER BAR */}
            <div className="mb-6 bg-card border border-border/70 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2 px-1">
                <span>
                  Langkah {activeStep + 1} dari {totalSteps}: {
                    activeStep < numQuestions
                      ? `Pertanyaan ${activeStep + 1}`
                      : isFeedbackStep
                        ? 'Kotak Aspirasi'
                        : 'Review & Konfirmasi'
                  }
                </span>
                <span className="text-navy font-bold">
                  {Math.round(((activeStep + 1) / totalSteps) * 100)}%
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-navy h-full transition-all duration-300"
                  style={{ width: `${((activeStep + 1) / totalSteps) * 100}%` }}
                />
              </div>

              {/* Step Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {electionQuestions.map((q, idx) => {
                  const isDone = Boolean(answers[q.id])
                  const isCurrent = activeStep === idx
                  return (
                    <button
                      key={q.id || idx}
                      onClick={() => setActiveStep(idx)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium shrink-0 transition flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-navy text-white shadow-sm'
                          : isDone
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {isDone && <Check className="h-3 w-3" />}
                      Pertanyaan {idx + 1}
                    </button>
                  )
                })}

                {hasFeedbackStep && (
                  <button
                    onClick={() => setActiveStep(feedbackStepIndex)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium shrink-0 transition flex items-center gap-1 ${
                      activeStep === feedbackStepIndex
                        ? 'bg-navy text-white shadow-sm'
                        : feedbackText.trim()
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" /> Kotak Aspirasi
                  </button>
                )}

                <button
                  onClick={() => setActiveStep(reviewStepIndex)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium shrink-0 transition flex items-center gap-1 ${
                    activeStep === reviewStepIndex
                      ? 'bg-navy text-white shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" /> Konfirmasi
                </button>
              </div>
            </div>

            {loadingQuestions ? (
              <div className="space-y-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
              </div>
            ) : (
              <>
                {/* STEP 1..N: QUESTION & CHOICE OPTIONS */}
                {activeStep < numQuestions && currentQuestion && (
                  <div>
                    {/* QUESTION HEADER CARD */}
                    <Card className="border-border/80 shadow-sm overflow-hidden mb-6">
                      <div className="h-1.5 bg-gradient-to-r from-navy via-gold to-gold-dark" />
                      <CardContent className="p-6 sm:p-7">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-xs uppercase font-bold tracking-wider text-gold-dark">
                            Pertanyaan #{activeStep + 1} dari {numQuestions}
                          </span>
                          <div className="flex items-center gap-2">
                            {currentQuestion.is_required ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Wajib Dijawab
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                                Opsional
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h2 className="font-serif text-2xl sm:text-3xl text-navy leading-snug mb-3">
                          {currentQuestion.title}
                        </h2>

                        {currentQuestion.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border">
                            {currentQuestion.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* CANDIDATE OPTIONS */}
                    <div className="space-y-3.5 mb-8">
                      {(() => {
                        const qCandidates = getCandidatesForQuestion(currentQuestion)
                        if (qCandidates.length === 0) {
                          return (
                            <EmptyBox text="Belum ada opsi jawaban yang terdaftar untuk pertanyaan ini." />
                          )
                        }

                        return qCandidates.map((c: any, idx: number) => {
                          const isSelected = answers[currentQuestion.id] === String(c.id)
                          const label = c.label || c.name || 'Pilihan'

                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: String(c.id) }))
                              }}
                              className={`cursor-pointer rounded-xl p-5 border-2 transition-all flex items-start gap-4 ${
                                isSelected
                                  ? 'border-navy bg-navy/5 shadow-md scale-[1.01]'
                                  : 'border-border bg-card hover:border-navy/40 hover:bg-secondary/40'
                              }`}
                            >
                              {/* Selection Indicator */}
                              <div className={`mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                                isSelected ? 'border-navy bg-navy text-white' : 'border-muted-foreground/40'
                              }`}>
                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>

                              {/* Gambar Opsi jika ada */}
                              {c.image_url ? (
                                <img
                                  src={c.image_url}
                                  alt={label}
                                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg border border-border shrink-0"
                                  onError={(ev: any) => { ev.target.style.display = 'none' }}
                                />
                              ) : (
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-navy/10 text-navy font-serif font-bold text-lg flex items-center justify-center shrink-0">
                                  {c.order_number || idx + 1}
                                </div>
                              )}

                              {/* Konten Opsi */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs uppercase font-bold tracking-wider text-gold-dark">
                                    Opsi {c.order_number || idx + 1}
                                  </span>
                                  {c.user_name && (
                                    <span className="text-xs text-muted-foreground">
                                      ({c.user_name})
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-serif text-lg sm:text-xl text-navy font-bold leading-snug mt-0.5">
                                  {label}
                                </h3>
                                {c.description && (
                                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                    {c.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}

                {/* STEP FEEDBACK: KOTAK ASPIRASI (100% ANONIM) */}
                {isFeedbackStep && (
                  <Card className="border-border/80 shadow-sm overflow-hidden mb-8">
                    <div className="h-1.5 bg-gradient-to-r from-navy via-gold to-gold-dark" />
                    <CardContent className="p-6 sm:p-8 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center text-gold-dark">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="font-serif text-2xl text-navy">Kotak Aspirasi: Kritik & Saran</h2>
                          <p className="text-xs text-muted-foreground">Bagikan masukan Anda untuk kepengurusan dan alumni.</p>
                        </div>
                      </div>

                      {/* Anonymity Notice */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-900 leading-relaxed">
                          <strong>Kerahasiaan Terjamin 100%:</strong> Masukan Anda disimpan tanpa atribut identitas alumni, nama, maupun akun pengguna (terisolasi secara anonim). Silakan sampaikan evaluasi atau saran Anda dengan bebas dan bertanggung jawab.
                        </div>
                      </div>

                      {/* Prompt */}
                      <div className="text-sm font-medium text-navy">
                        {selectedElection.feedback_prompt || 'Tuliskan kritik dan saran konstruktif Anda untuk kemajuan IKA SMA Unggulan CT ARSA Foundation:'}
                      </div>

                      <Textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={6}
                        placeholder="Tuliskan aspirasi, masukan program kerja, atau evaluasi Anda di sini... (Boleh dikosongkan jika tidak ada)"
                        className="resize-none"
                      />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Opsional — Anda boleh mengosongkan kolom ini jika tidak ingin memberikan masukan.</span>
                        <span>{feedbackText.length} karakter</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* STEP REVIEW & KONFIRMASI */}
                {isReviewStep && (
                  <div className="space-y-6 mb-8">
                    <Card className="border-border/80 shadow-sm overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-navy via-gold to-gold-dark" />
                      <CardContent className="p-6 sm:p-8">
                        <h2 className="font-serif text-2xl text-navy mb-1">
                          Tinjau Pilihan Suara Anda
                        </h2>
                        <p className="text-xs text-muted-foreground mb-6">
                          Pastikan semua pilihan Anda sudah sesuai sebelum mengirim ke kotak suara resmi.
                        </p>

                        <div className="space-y-4">
                          {electionQuestions.map((q, idx) => {
                            const qCandidates = getCandidatesForQuestion(q)
                            const chosenCandId = answers[q.id]
                            const chosenCand = qCandidates.find((c: any) => String(c.id) === String(chosenCandId))

                            return (
                              <div
                                key={q.id || idx}
                                className="p-4 rounded-xl border border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex-1">
                                  <div className="text-xs uppercase font-bold text-gold-dark tracking-wider mb-1">
                                    Pertanyaan {idx + 1}
                                  </div>
                                  <div className="font-semibold text-navy text-base leading-snug">
                                    {q.title}
                                  </div>
                                </div>

                                <div className="text-right sm:border-l sm:border-border sm:pl-4 min-w-[200px]">
                                  {chosenCand ? (
                                    <div className="flex items-center sm:justify-end gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span className="font-bold text-navy">
                                        {chosenCand.label || chosenCand.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs italic text-red-600 flex items-center sm:justify-end gap-1">
                                      <AlertCircle className="h-3.5 w-3.5" /> Belum dijawab
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setActiveStep(idx)}
                                    className="text-xs text-gold-dark hover:underline block mt-1 sm:text-right"
                                  >
                                    Ubah pilihan
                                  </button>
                                </div>
                              </div>
                            )
                          })}

                          {hasFeedbackStep && (
                            <div className="p-4 rounded-xl border border-border bg-secondary/30">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="text-xs uppercase font-bold text-gold-dark tracking-wider flex items-center gap-1.5">
                                  <MessageSquare className="h-3.5 w-3.5" /> Kritik & Saran Anonim
                                </div>
                                <button
                                  onClick={() => setActiveStep(feedbackStepIndex)}
                                  className="text-xs text-gold-dark hover:underline"
                                >
                                  Ubah masukan
                                </button>
                              </div>
                              {feedbackText.trim() ? (
                                <p className="text-sm text-navy italic bg-background p-3 rounded-lg border border-border">
                                  "{feedbackText.trim()}"
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  (Tidak ada kritik & saran yang dituliskan)
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-gold-dark shrink-0" />
                          <span>Setelah dikonfirmasi, suara akan direkam secara permanen dan tidak dapat diubah kembali.</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* BOTTOM NAVIGATION CONTROLS */}
                <div className="sticky bottom-4 z-30 bg-card border border-border/90 shadow-xl rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={activeStep === 0}
                    className="border-navy/20 text-navy"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
                  </Button>

                  <div className="hidden sm:block text-xs text-muted-foreground text-center">
                    {activeStep < numQuestions && currentQuestion?.is_required && !answers[currentQuestion.id] ? (
                      <span className="text-red-600 font-medium">* Wajib memilih 1 opsi untuk lanjut</span>
                    ) : (
                      <span>Langkah {activeStep + 1} dari {totalSteps}</span>
                    )}
                  </div>

                  {activeStep < reviewStepIndex ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceedFromQuestion()}
                      className="bg-navy hover:bg-navy-light text-white px-6"
                    >
                      {activeStep === reviewStepIndex - 1 ? 'Tinjau Pilihan' : 'Selanjutnya'} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setConfirmOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow"
                    >
                      Kirim Suara Sekarang <CheckCircle2 className="h-5 w-5 ml-2" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* CONFIRM MODAL */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-navy">Konfirmasi Akhir Bilik Suara</DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin mengirimkan seluruh pilihan suara ini ke sistem E-Voting?
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-4 rounded-xl bg-navy/5 border border-navy/20 space-y-2">
            <div className="text-xs uppercase font-bold text-gold-dark tracking-wider">Ringkasan:</div>
            <div className="text-sm font-semibold text-navy">
              {electionQuestions.length} Pertanyaan terjawab pada sesi {selectedElection?.name}
            </div>
            {hasFeedbackStep && feedbackText.trim() && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Check className="h-3 w-3 text-emerald-600" /> Disertai 1 masukan kritik & saran (100% anonim)
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gold-dark shrink-0" />
            Suara Anda akan direkam secara anonim dan Anda akan menerima kode receipt digital sebagai bukti sah.
          </p>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Periksa Kembali
            </Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={castVote} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Merekam Suara...</>
              ) : (
                <>Ya, Konfirmasi & Kirim <CheckCircle2 className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUCCESS MODAL WITH RECEIPT AND PDF DOWNLOAD */}
      <Dialog
        open={!!successReceipt}
        onOpenChange={(o) => {
          if (!o) {
            setSuccessReceipt(null)
            setSelectedElection(null)
            setElectionQuestions([])
          }
        }}
      >
        <DialogContent className="text-center max-w-md">
          <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-navy text-center">Suara Anda Berhasil Direkam!</DialogTitle>
            <DialogDescription className="text-center">
              Terima kasih atas partisipasi aktif Anda. Hak suara Anda telah dienkripsi secara anonim dan aman di dalam database.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 rounded-xl border-2 border-dashed border-gold/40 bg-gold/5 p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Kode Receipt Digital</div>
            <div className="font-mono text-xl font-bold text-navy break-all">{successReceipt}</div>
            <Button variant="ghost" size="sm" className="mt-2 text-gold-dark hover:text-gold-dark" onClick={() => copyReceipt(successReceipt)}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Salin Kode Receipt
            </Button>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button className="bg-gold hover:bg-gold-dark text-navy font-semibold" onClick={() => generateCertificate(successReceipt)}>
              <Download className="h-4 w-4 mr-2" /> Unduh Bukti Suara (PDF)
            </Button>
            <Button
              variant="outline"
              className="border-navy/20 text-navy hover:bg-navy/5"
              onClick={() => {
                setSuccessReceipt(null)
                setSelectedElection(null)
                setElectionQuestions([])
              }}
            >
              Kembali ke Daftar Voting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 px-6 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
        <CalendarClock className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">{text}</p>
    </div>
  )
}
