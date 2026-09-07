'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiFetch, fmtDate, electionStatus, STATUS_LABEL, getSession, clearToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Vote, ShieldCheck, Users, ScrollText, Target, Flag, ArrowRight, CalendarClock, Menu, X, Timer } from 'lucide-react'
import Countdown from '@/components/Countdown'

const HERO = 'https://images.unsplash.com/photo-1633734973050-d6499a977c17?crop=entropy&cs=srgb&fm=jpg&w=1200&auto=format&fit=crop&q=75'
const UNITY = 'https://images.unsplash.com/photo-1785970033901-514a8d8bad29?crop=entropy&cs=srgb&fm=jpg&w=800&auto=format&fit=crop&q=75'

const statusStyle = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  ended: 'bg-slate-100 text-slate-600 border-slate-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
}

function initialsColor(str = '') {
  return '#c9a86a'
}

export default function LandingPage() {
  const [elections, setElections] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [session, setSession] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setSession(getSession())
    ;(async () => {
      try {
        const [el, ca] = await Promise.all([
          apiFetch('/elections', { auth: false }).catch(() => ({ data: [] })),
          apiFetch('/candidates', { auth: false }).catch(() => ({ data: [] })),
        ])
        setElections(Array.isArray(el?.data) ? el.data : [])
        setCandidates(Array.isArray(ca?.data) ? ca.data : [])
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

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 backdrop-blur text-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-9 md:h-10 w-auto object-contain" />
            <span className="hidden sm:inline-block h-6 w-px bg-white/20" />
            <span className="hidden sm:inline-block text-[11px] uppercase tracking-[0.2em] text-gold/90 font-medium">E-Voting</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
            <a href="#pemilihan" className="hover:text-gold transition">Pemilihan</a>
            <a href="#kandidat" className="hover:text-gold transition">Kandidat</a>
            <a href="#tentang" className="hover:text-gold transition">Tentang</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link href={session.role === 'admin' ? '/admin' : '/vote'}>
                  <Button className="bg-gold hover:bg-gold-dark text-navy font-medium">Dashboard</Button>
                </Link>
                <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={logout}>Keluar</Button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-gold hover:bg-gold-dark text-navy font-medium">Masuk untuk Memilih</Button>
              </Link>
            )}
          </div>
          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-navy px-6 py-4 space-y-3 text-white/80">
            <a href="#pemilihan" className="block" onClick={() => setMenuOpen(false)}>Pemilihan</a>
            <a href="#kandidat" className="block" onClick={() => setMenuOpen(false)}>Kandidat</a>
            <a href="#tentang" className="block" onClick={() => setMenuOpen(false)}>Tentang</a>
            <Link href={session ? (session.role === 'admin' ? '/admin' : '/vote') : '/login'} className="block">
              <Button className="w-full bg-gold hover:bg-gold-dark text-navy">{session ? 'Dashboard' : 'Masuk untuk Memilih'}</Button>
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="Alumni" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/85 to-navy" />
        </div>
        <div className="container relative z-10 py-24 md:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-6 bg-gold/15 text-gold border border-gold/30 hover:bg-gold/15">Pemilihan Ketua Ikatan Alumni 2025</Badge>
            <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] mb-6">
              Tentukan Arah <span className="text-gold">Ikatan Alumni</span> Bersama.
            </h1>
            <p className="text-lg text-white/75 mb-9 max-w-2xl">
              Sistem e-voting resmi Ikatan Alumni SMA Unggulan CT ARSA Foundation. Berikan suara Anda secara aman, rahasia, dan transparan untuk memilih Ketua periode mendatang.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={session ? (session.role === 'admin' ? '/admin' : '/vote') : '/login'}>
                <Button size="lg" className="bg-gold hover:bg-gold-dark text-navy font-semibold h-12 px-7">
                  Mulai Memilih <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#kandidat">
                <Button size="lg" variant="outline" className="h-12 px-7 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  Lihat Kandidat
                </Button>
              </a>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { icon: ShieldCheck, label: 'Aman & Rahasia' },
                { icon: ScrollText, label: 'Bukti Suara (Receipt)' },
                { icon: Users, label: 'Untuk Semua Angkatan' },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-start gap-2">
                  <f.icon className="h-6 w-6 text-gold" />
                  <span className="text-sm text-white/70">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PEMILIHAN */}
      <section id="pemilihan" className="container py-20">
        <SectionHead eyebrow="Agenda" title="Pemilihan Aktif" subtitle="Periode pemungutan suara yang sedang atau akan berlangsung." />
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        ) : elections.length === 0 ? (
          <EmptyState icon={CalendarClock} text="Belum ada agenda pemilihan yang dipublikasikan. Silakan cek kembali nanti." />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {elections.map((e) => {
              const st = electionStatus(e)
              return (
                <Card key={e.id} className="border-border/70 overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-gold to-gold-dark" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-serif text-xl text-navy">{e.name}</h3>
                      <Badge variant="outline" className={statusStyle[st]}>{STATUS_LABEL[st]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{e.description || 'Pemilihan Ketua Ikatan Alumni.'}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs mb-0.5">Mulai</div>
                        <div className="font-medium">{fmtDate(e.start_time)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs mb-0.5">Selesai</div>
                        <div className="font-medium">{fmtDate(e.end_time)}</div>
                      </div>
                    </div>
                    {(st === 'active' || st === 'upcoming') && (
                      <div className="mt-5 flex items-center gap-2 rounded-lg bg-secondary/70 border border-border px-3 py-2 text-sm">
                        <Timer className="h-4 w-4 text-gold-dark shrink-0" />
                        <span className="text-muted-foreground">{st === 'active' ? 'Berakhir dalam' : 'Dibuka dalam'}</span>
                        <Countdown target={st === 'active' ? e.end_time : e.start_time} className="font-semibold text-navy ml-auto" endedText="Segera" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* KANDIDAT */}
      <section id="kandidat" className="bg-secondary/50 border-y border-border/60">
        <div className="container py-20">
          <SectionHead eyebrow="Para Calon" title="Kandidat Ketua Alumni" subtitle="Kenali visi dan misi setiap kandidat sebelum menentukan pilihan Anda." />
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : candidates.length === 0 ? (
            <EmptyState icon={Users} text="Daftar kandidat belum tersedia. Kandidat akan ditampilkan setelah ditetapkan oleh panitia." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((c) => (
                <Card key={c.id} className="group border-border/70 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="h-16 w-16 rounded-full bg-navy text-gold flex items-center justify-center font-serif text-xl border-2 border-gold/40">
                        {(c.initials || c.user_name || '?').toString().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wider text-gold-dark font-semibold">Kandidat</div>
                        <h3 className="font-serif text-lg text-navy truncate">{c.user_name || c.initials}</h3>
                        {c.batch_name && <div className="text-xs text-muted-foreground">Angkatan {c.batch_name}</div>}
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-navy mb-1"><Target className="h-3.5 w-3.5 text-gold-dark" /> Visi</div>
                        <p className="text-muted-foreground line-clamp-2">{c.vision || '-'}</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="mt-4 px-0 text-navy hover:text-gold-dark hover:bg-transparent" onClick={() => setDetail(c)}>
                      Lihat Visi &amp; Misi <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-12 text-center">
            <Link href="/login">
              <Button size="lg" className="bg-navy hover:bg-navy-light text-white h-12 px-8">Masuk untuk Memberikan Suara</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TENTANG */}
      <section id="tentang" className="container py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -inset-3 bg-gold/10 rounded-3xl -z-10" />
            <img src={UNITY} alt="Kebersamaan Alumni" className="rounded-2xl w-full h-[360px] object-cover shadow-xl" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold-dark font-semibold mb-3">Tentang E-Voting</div>
            <h2 className="font-serif text-3xl md:text-4xl text-navy mb-5">Demokrasi Alumni yang Modern &amp; Terpercaya</h2>
            <p className="text-muted-foreground mb-6">
              Platform ini dirancang untuk memastikan setiap suara alumni SMA Unggulan CT ARSA Foundation dihitung secara akurat. Setiap pemilih menerima kode bukti (receipt) sebagai tanda suara telah tercatat, tanpa mengorbankan kerahasiaan pilihan.
            </p>
            <ul className="space-y-4">
              {[
                { icon: ShieldCheck, t: 'Autentikasi Aman', d: 'Login berbasis token untuk memastikan hanya alumni terdaftar yang memilih.' },
                { icon: Flag, t: 'Satu Suara per Pemilih', d: 'Sistem mencegah suara ganda pada setiap pemilihan.' },
                { icon: ScrollText, t: 'Bukti Transparan', d: 'Kode receipt unik untuk setiap suara yang berhasil masuk.' },
              ].map((it, i) => (
                <li key={i} className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-navy/5 border border-border flex items-center justify-center">
                    <it.icon className="h-5 w-5 text-gold-dark" />
                  </div>
                  <div>
                    <div className="font-semibold text-navy">{it.t}</div>
                    <div className="text-sm text-muted-foreground">{it.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-white">
        <div className="container py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-4">Suara Anda Menentukan Masa Depan</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-8">Bergabunglah dalam pemilihan Ketua Ikatan Alumni. Setiap suara berarti.</p>
          <Link href="/login">
            <Button size="lg" className="bg-gold hover:bg-gold-dark text-navy font-semibold h-12 px-8">Masuk Sekarang <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      <footer className="bg-navy-dark text-white/60 border-t border-white/10">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-7 w-auto object-contain brightness-95" />
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="text-xs sm:text-sm">E-Voting Pemilihan Ketua Ikatan Alumni</span>
          </div>
          <div>&copy; {new Date().getFullYear()} Ikatan Alumni SMAU CT ARSA. Seluruh hak cipta dilindungi.</div>
        </div>
      </footer>

      {/* CANDIDATE DETAIL DIALOG */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-navy text-gold flex items-center justify-center font-serif text-xl border-2 border-gold/40">
                    {(detail.initials || detail.user_name || '?').toString().slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="font-serif text-xl text-navy text-left">{detail.user_name || detail.initials}</DialogTitle>
                    <div className="text-sm text-muted-foreground text-left">
                      {detail.batch_name ? `Angkatan ${detail.batch_name}` : ''}{detail.election_name ? ` \u00b7 ${detail.election_name}` : ''}
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-5 mt-2 max-h-[55vh] overflow-y-auto pr-1">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-navy mb-1.5"><Target className="h-4 w-4 text-gold-dark" /> Visi</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{detail.vision || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-navy mb-1.5"><Flag className="h-4 w-4 text-gold-dark" /> Misi</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{detail.mission || '-'}</p>
                </div>
              </div>
              <Link href="/login" className="mt-2">
                <Button className="w-full bg-navy hover:bg-navy-light text-white">Masuk untuk Memilih Kandidat Ini</Button>
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionHead({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-12 max-w-2xl">
      <div className="text-xs uppercase tracking-[0.25em] text-gold-dark font-semibold mb-3">{eyebrow}</div>
      <h2 className="font-serif text-3xl md:text-4xl text-navy mb-3">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 px-6 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">{text}</p>
    </div>
  )
}
