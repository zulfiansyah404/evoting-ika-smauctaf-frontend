'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiFetch, fmtDate, electionStatus, STATUS_LABEL, getSession, clearToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, CalendarClock, Menu, Timer, Users, X } from 'lucide-react'
import Countdown from '@/components/Countdown'

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-900 border-amber-200',
  ended: 'bg-rose-100 text-rose-900 border-rose-200',
  complete: 'bg-blue-100 text-blue-900 border-blue-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  unknown: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function LandingPage() {
  const [elections, setElections] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setSession(getSession())
    ;(async () => {
      try {
        const [el, ca] = await Promise.all([
          apiFetch('/elections', { auth: false }).catch(() => ({ data: [] })),
          apiFetch('/candidates', { auth: false }).catch(() => ({ data: [] })),
        ])
        const elList = Array.isArray(el?.data) ? el.data : []
        const caList = Array.isArray(ca?.data) ? ca.data : []
        setElections(elList)
        setCandidates(caList)
        if (caList.length > 0) {
          setSelectedCandidateId(String(caList[0].id))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const logout = () => {
    clearToken()
    setSession(null)
  }

  const activeElection = elections.find((e) => electionStatus(e) === 'active') || elections[0]
  const activeStatus = activeElection ? electionStatus(activeElection) : null
  const selectedCandidate =
    candidates.find((c) => String(c.id) === selectedCandidateId) || candidates[0] || null

  const authHref = session ? (session.role === 'admin' ? '/admin' : '/vote') : '/login'

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-navy text-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-9 md:h-10 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/85">
            <a href="#pemilihan" className="hover:text-gold transition-colors">Pemilihan</a>
            <a href="#kandidat" className="hover:text-gold transition-colors">Kandidat</a>
            <a href="#tentang" className="hover:text-gold transition-colors">Mekanisme</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link href={authHref}>
                  <Button className="bg-gold hover:bg-gold-dark text-navy font-medium">Dashboard</Button>
                </Link>
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={logout}>
                  Keluar
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-gold hover:bg-gold-dark text-navy font-medium">Masuk untuk Memilih</Button>
              </Link>
            )}
          </div>
          <button
            type="button"
            aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={menuOpen}
            className="md:hidden text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-navy-dark px-6 py-4 space-y-3 text-white/90">
            <a href="#pemilihan" className="block py-1" onClick={() => setMenuOpen(false)}>Pemilihan</a>
            <a href="#kandidat" className="block py-1" onClick={() => setMenuOpen(false)}>Kandidat</a>
            <a href="#tentang" className="block py-1" onClick={() => setMenuOpen(false)}>Mekanisme</a>
            <Link href={authHref} className="block pt-2" onClick={() => setMenuOpen(false)}>
              <Button className="w-full bg-gold hover:bg-gold-dark text-navy font-medium">
                {session ? 'Dashboard' : 'Masuk untuk Memilih'}
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="bg-navy text-white">
        <div className="container py-16 md:py-24 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.06] mb-6">
              Pemilihan Ketua IKA SMAU CT ARSA
            </h1>
            <p className="text-base sm:text-lg text-white/80 mb-8 max-w-xl leading-relaxed">
              Portal pemungutan suara resmi Ikatan Alumni SMA Unggulan CT ARSA Foundation. Setiap alumni terverifikasi memiliki satu hak suara rahasia dengan kode bukti pencatatan.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={authHref}>
                <Button size="lg" className="bg-gold hover:bg-gold-dark text-navy font-semibold h-12 px-7">
                  {session ? 'Buka Bilik Suara' : 'Masuk untuk Memilih'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#kandidat">
                <Button size="lg" variant="ghost" className="h-12 px-6 text-white hover:bg-white/10 hover:text-white">
                  Lihat Kandidat
                </Button>
              </a>
            </div>
          </div>

          {/* LIVE STATUS PANEL */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-navy-light p-6 sm:p-8 text-white">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-32 bg-white/10" />
                  <Skeleton className="h-8 w-3/4 bg-white/10" />
                  <Skeleton className="h-16 w-full bg-white/10" />
                </div>
              ) : activeElection ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gold font-medium">Status Pemilihan</span>
                    {activeStatus && (
                      <Badge variant="outline" className={statusStyle[activeStatus]}>
                        {STATUS_LABEL[activeStatus]}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl leading-snug mb-2">{activeElection.name}</h2>
                    <p className="text-sm text-white/75 line-clamp-2">
                      {activeElection.question || activeElection.description || 'Pemungutan suara resmi Ikatan Alumni SMAU CT ARSA.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                    <div>
                      <div className="text-white/60 text-xs mb-1">Mulai</div>
                      <div className="font-medium">{fmtDate(activeElection.start_time)}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs mb-1">Selesai</div>
                      <div className="font-medium">{fmtDate(activeElection.end_time)}</div>
                    </div>
                  </div>
                  {(activeStatus === 'active' || activeStatus === 'upcoming') && (
                    <div className="rounded-xl bg-navy p-4 flex items-center justify-between gap-3">
                      <span className="text-sm text-white/75 flex items-center gap-2">
                        <Timer className="h-4 w-4 text-gold shrink-0" />
                        {activeStatus === 'active' ? 'Berakhir dalam' : 'Dibuka dalam'}
                      </span>
                      <Countdown
                        target={activeStatus === 'active' ? activeElection.end_time : activeElection.start_time}
                        className="font-semibold text-gold tabular-nums"
                        endedText="Segera"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="text-sm text-gold font-medium">Status Pemilihan</div>
                  <h2 className="font-serif text-2xl">Belum Ada Agenda Aktif</h2>
                  <p className="text-sm text-white/75">
                    Panitia belum mempublikasikan jadwal pemilihan. Informasi akan tampil otomatis di panel ini saat pemilihan dibuka.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PEMILIHAN — Editorial List Layout */}
      <section id="pemilihan" className="container py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-serif text-3xl md:text-4xl text-navy mb-3">Agenda Pemilihan</h2>
          <p className="text-muted-foreground text-base">
            Daftar sesi pemungutan suara yang sedang berlangsung maupun terjadwal untuk alumni.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : elections.length === 0 ? (
          <EmptyState icon={CalendarClock} text="Belum ada agenda pemilihan yang dipublikasikan. Silakan cek kembali nanti." />
        ) : (
          <div className="space-y-4">
            {elections.map((e) => {
              const st = electionStatus(e)
              return (
                <article
                  key={e.id}
                  className="rounded-xl bg-secondary p-6 md:p-8 grid lg:grid-cols-12 gap-6 items-start"
                >
                  <div className="lg:col-span-5 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-2xl text-navy">{e.name}</h3>
                      <Badge variant="outline" className={statusStyle[st]}>{STATUS_LABEL[st]}</Badge>
                    </div>
                    {e.question && (
                      <p className="text-sm font-medium text-navy/90">{e.question}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {e.description || 'Sesi pemungutan suara resmi IKA SMAUCTAF.'}
                    </p>
                  </div>

                  <div className="lg:col-span-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Dibuka</div>
                      <div className="font-medium text-navy">{fmtDate(e.start_time)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Ditutup</div>
                      <div className="font-medium text-navy">{fmtDate(e.end_time)}</div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
                    {(st === 'active' || st === 'upcoming') && (
                      <div className="text-sm text-navy flex items-center gap-2">
                        <Timer className="h-4 w-4 text-gold-dark shrink-0" />
                        <Countdown
                          target={st === 'active' ? e.end_time : e.start_time}
                          className="font-semibold tabular-nums"
                          endedText="Segera"
                        />
                      </div>
                    )}
                    <Link href={authHref}>
                      <Button className="bg-navy hover:bg-navy-light text-white">
                        {st === 'active' ? 'Berikan Suara' : 'Masuk ke Portal'}
                      </Button>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* KANDIDAT & OPSI — Interactive Split Showcase */}
      <section id="kandidat" className="bg-secondary py-20">
        <div className="container">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-serif text-3xl md:text-4xl text-navy mb-3">Kandidat &amp; Pilihan Suara</h2>
            <p className="text-muted-foreground text-base">
              Pilih nama kandidat di sebelah kiri untuk membaca profil, visi, dan misi secara lengkap.
            </p>
          </div>

          {loading ? (
            <div className="grid lg:grid-cols-12 gap-6">
              <Skeleton className="lg:col-span-5 h-72 rounded-xl" />
              <Skeleton className="lg:col-span-7 h-72 rounded-xl" />
            </div>
          ) : candidates.length === 0 ? (
            <EmptyState icon={Users} text="Daftar opsi atau kandidat belum tersedia saat ini." />
          ) : (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Candidate Selector */}
              <div className="lg:col-span-5 space-y-2.5" role="listbox" aria-label="Daftar kandidat">
                {candidates.map((c, idx) => {
                  const label = c.label || c.name || c.user_name || 'Pilihan'
                  const isSelected = selectedCandidate && String(selectedCandidate.id) === String(c.id)
                  const number = c.order_number || idx + 1
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={!!isSelected}
                      onClick={() => setSelectedCandidateId(String(c.id))}
                      className={`w-full text-left rounded-xl p-4 flex items-center gap-4 transition-colors ${
                        isSelected
                          ? 'bg-navy text-white'
                          : 'bg-card text-navy hover:bg-accent'
                      }`}
                    >
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={label}
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                          onError={(ev: any) => { ev.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className={`h-14 w-14 rounded-lg flex items-center justify-center font-serif text-xl font-bold shrink-0 ${
                          isSelected ? 'bg-gold text-navy' : 'bg-secondary text-navy'
                        }`}>
                          {number}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-medium mb-0.5 ${isSelected ? 'text-gold' : 'text-gold-dark'}`}>
                          Nomor Urut {number}
                        </div>
                        <div className="font-serif text-lg font-bold truncate">{label}</div>
                        {c.batch_name && (
                          <div className={`text-xs ${isSelected ? 'text-white/75' : 'text-muted-foreground'}`}>
                            Angkatan {c.batch_name}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Candidate Detail Panel */}
              {selectedCandidate && (
                <div className="lg:col-span-7 rounded-2xl bg-card p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gold-dark mb-1">
                        Nomor Urut {selectedCandidate.order_number || candidates.indexOf(selectedCandidate) + 1}
                        {selectedCandidate.batch_name ? ` · Angkatan ${selectedCandidate.batch_name}` : ''}
                      </div>
                      <h3 className="font-serif text-2xl sm:text-3xl text-navy">
                        {selectedCandidate.label || selectedCandidate.name || selectedCandidate.user_name || 'Pilihan'}
                      </h3>
                      {selectedCandidate.election_name && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedCandidate.election_name}</p>
                      )}
                    </div>
                    <Link href={authHref}>
                      <Button className="bg-navy hover:bg-navy-light text-white">
                        Pilih di Bilik Suara <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-5 text-sm sm:text-base">
                    <div>
                      <h4 className="font-semibold text-navy mb-1.5">Visi</h4>
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                        {selectedCandidate.vision || selectedCandidate.description || 'Belum ada keterangan visi.'}
                      </p>
                    </div>
                    {selectedCandidate.mission && (
                      <div>
                        <h4 className="font-semibold text-navy mb-1.5">Misi</h4>
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                          {selectedCandidate.mission}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* MEKANISME — 3-Column Typographic Flow */}
      <section id="tentang" className="container py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-serif text-3xl md:text-4xl text-navy mb-3">
            Alur Pemungutan Suara
          </h2>
          <p className="text-muted-foreground text-base">
            Tiga langkah singkat untuk memastikan suara Anda tercatat sah tanpa mengorbankan kerahasiaan pilihan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'Masuk dengan Akun Terdaftar',
              desc: 'Gunakan email atau nomor ponsel yang telah diverifikasi panitia IKA SMAU CT ARSA untuk mengakses bilik suara.',
            },
            {
              step: '2',
              title: 'Tentukan Pilihan Anda',
              desc: 'Tinjau profil kandidat atau opsi keputusan pada sesi aktif, lalu kirimkan suara secara rahasia. Sistem mencegah suara ganda.',
            },
            {
              step: '3',
              title: 'Simpan Bukti Suara (Receipt)',
              desc: 'Setelah suara masuk, Anda menerima kode bukti unik sebagai tanda partisipasi tercatat dalam rekapitulasi resmi.',
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl bg-secondary p-6 sm:p-8 space-y-3">
              <div className="font-serif text-4xl text-gold-dark">{item.step}</div>
              <h3 className="font-serif text-xl text-navy">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-white">
        <div className="container py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl md:text-4xl mb-3">Gunakan Hak Suara Anda</h2>
            <p className="text-white/80">
              Partisipasi setiap angkatan menentukan arah kepengurusan Ikatan Alumni SMAU CT ARSA Foundation.
            </p>
          </div>
          <Link href={authHref}>
            <Button size="lg" className="bg-gold hover:bg-gold-dark text-navy font-semibold h-12 px-8 shrink-0">
              {session ? 'Buka Bilik Suara' : 'Masuk Sekarang'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-navy-dark text-white/75">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-7 w-auto object-contain brightness-95" />
            <span>E-Voting Pemilihan Ketua Ikatan Alumni</span>
          </div>
          <div>&copy; {new Date().getFullYear()} Ikatan Alumni SMAU CT ARSA. Seluruh hak cipta dilindungi.</div>
        </div>
      </footer>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="rounded-2xl bg-secondary py-14 px-6 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-card flex items-center justify-center">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">{text}</p>
    </div>
  )
}
