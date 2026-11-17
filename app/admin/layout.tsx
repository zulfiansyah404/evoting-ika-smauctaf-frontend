'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  getSession, clearToken, UserSession,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, CalendarDays, UserSquare2, GraduationCap, Users2,
  ListChecks, LogOut, Menu, ShieldCheck,
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
  { href: '/admin/elections', label: 'Pemilihan', icon: CalendarDays },
  { href: '/admin/candidates', label: 'Pilihan Suara', icon: UserSquare2 },
  { href: '/admin/batches', label: 'Angkatan', icon: GraduationCap },
  { href: '/admin/users', label: 'Pengguna', icon: Users2 },
  { href: '/admin/results', label: 'Hasil Suara', icon: ListChecks },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<UserSession | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) {
      router.replace('/login')
      return
    }
    if (s.role !== 'admin' && s.role !== 'operator') {
      router.replace('/vote')
      return
    }
    if (s.role === 'operator' && pathname !== '/admin/users') {
      router.replace('/admin/users')
      return
    }
    setSession(s)
  }, [router, pathname])

  const logout = () => {
    clearToken()
    router.replace('/login')
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-secondary/40 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
      </div>
    )
  }

  const visibleNav = session.role === 'operator'
    ? NAV.filter((n) => n.href === '/admin/users')
    : NAV
  const currentNav = visibleNav.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href))

  return (
    <div className="min-h-dvh bg-secondary/40 flex">
      {/* SIDEBAR (Sticky locked to viewport on desktop) */}
      <aside className={`fixed lg:sticky top-0 h-dvh shrink-0 z-50 inset-y-0 left-0 w-64 bg-navy text-white flex flex-col transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-4 bg-navy-dark shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-7 w-auto object-contain" />
          </Link>
          <span className="text-[10px] uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded border border-gold/30 font-semibold">
            {session.role === 'operator' ? 'Operator' : 'Admin'}
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map((n) => {
            const isActive = n.exact ? pathname === n.href : pathname.startsWith(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-gold text-navy font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                <span>{session.role === 'operator' && n.href === '/admin/users' ? 'Kelola Voter' : n.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-3 bg-navy-dark shrink-0">
          <Button variant="ghost" className="w-full justify-start text-white/75 hover:text-white hover:bg-white/10" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
        <header className="h-16 bg-card flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              className="lg:hidden p-1 rounded-md hover:bg-secondary"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6 text-navy" />
            </button>
            <h1 className="font-serif text-xl text-navy">
              {session.role === 'operator' ? 'Manajemen Pemilih (Voter)' : (currentNav?.label || 'Dashboard Admin')}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-navy font-medium">
              <ShieldCheck className="h-4 w-4 text-gold-dark" />
              <span>{session.name || (session.role === 'operator' ? 'Operator Voter' : 'Administrator')}</span>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
              session.role === 'operator'
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-gold/15 text-gold-dark border-gold/30'
            }`}>
              {session.role === 'operator' ? 'Operator Voter' : 'Admin'}
            </span>
          </div>
        </header>

        <main className="p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

