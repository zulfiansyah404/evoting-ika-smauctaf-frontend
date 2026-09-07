'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch, setToken, decodeToken, getSession } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (s) router.replace(s.role === 'admin' ? '/admin' : '/vote')
  }, [router])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiFetch('/login', { method: 'POST', auth: false, body: { email, password } })
      const token = res?.data?.token
      if (!token) throw new Error('Token tidak ditemukan pada respons')
      setToken(token)
      const d = decodeToken(token)
      toast.success('Login berhasil')
      router.replace(d?.role === 'admin' ? '/admin' : '/vote')
    } catch (err) {
      toast.error(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-navy text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #c9a86a 0, transparent 40%), radial-gradient(circle at 80% 80%, #243149 0, transparent 45%)' }} />
        <Link href="/" className="relative z-10 inline-flex items-center gap-2 text-gold hover:text-gold-light transition">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>
        <div className="relative z-10">
          <div className="mb-8">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-12 w-auto object-contain" />
            <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-gold/80 font-medium">Sistem E-Voting Resmi</div>
          </div>
          <h1 className="font-serif text-4xl leading-tight mb-4">Suara Anda,<br />Masa Depan Alumni.</h1>
          <p className="text-white/70 max-w-md">Masuk untuk memberikan suara pada Pemilihan Ketua Ikatan Alumni SMA Unggulan CT ARSA Foundation secara aman dan transparan.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-white/60">
          <ShieldCheck className="h-4 w-4 text-gold" /> Terenkripsi & Rahasia
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-block">
              <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-9 w-auto object-contain" />
            </Link>
          </div>
          <h2 className="font-serif text-3xl mb-1">Masuk</h2>
          <p className="text-muted-foreground mb-8">Gunakan email dan kata sandi terdaftar Anda.</p>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-navy hover:bg-navy-light text-white h-11" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</> : 'Masuk'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">Belum punya akun? Hubungi panitia / administrator alumni.</p>
        </div>
      </div>
    </div>
  )
}
