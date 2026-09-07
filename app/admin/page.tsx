'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  apiFetch, getSession, clearToken, fmtDate, toInputDate, electionStatus, STATUS_LABEL,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Vote, LogOut, LayoutDashboard, CalendarDays, UserSquare2, GraduationCap, Users2,
  ListChecks, Plus, Pencil, Trash2, Loader2, Menu, Trophy, ShieldCheck, Upload, FileSpreadsheet, Download,
} from 'lucide-react'

const NAV = [
  { key: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'election', label: 'Pemilihan', icon: CalendarDays },
  { key: 'candidate', label: 'Kandidat', icon: UserSquare2 },
  { key: 'batch', label: 'Angkatan', icon: GraduationCap },
  { key: 'user', label: 'Pengguna', icon: Users2 },
  { key: 'result', label: 'Hasil Suara', icon: ListChecks },
]

const ENDPOINTS = {
  election: { create: '/admin/elections', update: (id) => `/admin/elections/${id}`, del: (id) => `/admin/elections/${id}` },
  candidate: { create: '/admin/candidates', update: (id) => `/admin/candidates/${id}`, del: (id) => `/admin/candidates/${id}` },
  batch: { create: '/admin/batch', update: (id) => `/admin/batch/${id}`, del: (id) => `/admin/batch/${id}` },
  user: { create: '/admin/user', update: (id) => `/admin/user/${id}`, del: (id) => `/admin/user/${id}` },
}

const CHART_COLORS = ['#c9a86a', '#161e2e', '#3a7a6d', '#c9744a', '#7a5aa0']

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [elections, setElections] = useState([])
  const [candidates, setCandidates] = useState([])
  const [batches, setBatches] = useState([])
  const [users, setUsers] = useState([])
  const [ballots, setBallots] = useState([])

  const [modal, setModal] = useState(null) // { entity, mode, values }
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null) // { entity, id, label }
  const [deleting, setDeleting] = useState(false)
  const [importEntity, setImportEntity] = useState(null) // 'user' | 'batch'

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    if (s.role !== 'admin') { router.replace('/vote'); return }
    setSession(s)
    loadAll()
  }, [router])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [el, ca, ba, us, bl] = await Promise.all([
        apiFetch('/elections').catch(() => ({ data: [] })),
        apiFetch('/candidates').catch(() => ({ data: [] })),
        apiFetch('/admin/batches').catch(() => ({ data: [] })),
        apiFetch('/admin/users').catch(() => ({ data: [] })),
        apiFetch('/admin/ballots').catch(() => ({ data: [] })),
      ])
      setElections(Array.isArray(el?.data) ? el.data : [])
      setCandidates(Array.isArray(ca?.data) ? ca.data : [])
      setBatches(Array.isArray(ba?.data) ? ba.data : [])
      setUsers(Array.isArray(us?.data) ? us.data : [])
      setBallots(Array.isArray(bl?.data) ? bl.data : [])
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => { clearToken(); router.replace('/login') }

  // ---------- Save ----------
  const buildPayload = (entity, mode, v) => {
    if (entity === 'election') {
      const p = { name: v.name, description: v.description || '', end_time: new Date(v.end_time).toISOString() }
      if (mode === 'create') p.start_time = new Date(v.start_time).toISOString()
      else if (v.start_time) p.start_time = new Date(v.start_time).toISOString()
      return p
    }
    if (entity === 'candidate') {
      return {
        id_user: Number(v.id_user), id_election: Number(v.id_election),
        initials: v.initials, vision: v.vision, mission: v.mission,
      }
    }
    if (entity === 'batch') {
      return { name: v.name, branch: v.branch, number: Number(v.number) }
    }
    if (entity === 'user') {
      if (mode === 'edit') return { name: v.name, number: v.number }
      return { name: v.name, email: v.email, password: v.password, id_batch: Number(v.id_batch), number: v.number }
    }
    return v
  }

  const submitModal = async (e) => {
    e.preventDefault()
    const { entity, mode, values } = modal
    setSaving(true)
    try {
      const payload = buildPayload(entity, mode, values)
      if (mode === 'create') {
        await apiFetch(ENDPOINTS[entity].create, { method: 'POST', body: payload })
        toast.success('Data berhasil ditambahkan')
      } else {
        await apiFetch(ENDPOINTS[entity].update(values.id), { method: 'PUT', body: payload })
        toast.success('Data berhasil diperbarui')
      }
      setModal(null)
      await loadAll()
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await apiFetch(ENDPOINTS[confirmDel.entity].del(confirmDel.id), { method: 'DELETE' })
      toast.success('Data berhasil dihapus')
      setConfirmDel(null)
      await loadAll()
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus data')
    } finally {
      setDeleting(false)
    }
  }

  const openCreate = (entity) => setModal({ entity, mode: 'create', values: defaultValues(entity) })
  const openEdit = (entity, row) => setModal({ entity, mode: 'edit', values: toFormValues(entity, row) })
  const setVal = (k, val) => setModal((m) => ({ ...m, values: { ...m.values, [k]: val } }))

  const doImport = async (entity, rows) => {
    const target = entity === 'user' ? '/admin/users' : '/admin/batches'
    await apiFetch(target, { method: 'POST', body: rows })
    setImportEntity(null)
    await loadAll()
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-secondary/40 flex">
      {/* SIDEBAR */}
      <aside className={`fixed lg:static z-50 inset-y-0 left-0 w-64 bg-navy text-white flex flex-col transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="CT ARSA Foundation & IKA" className="h-7 w-auto object-contain" />
          </Link>
          <span className="text-[10px] uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded border border-gold/30 font-semibold">Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => { setTab(n.key); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${tab === n.key ? 'bg-gold text-navy font-semibold' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start text-white/75 hover:text-white hover:bg-white/10" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-6 w-6 text-navy" /></button>
            <h1 className="font-serif text-xl text-navy">{NAV.find((n) => n.key === tab)?.label}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-gold-dark" /> Administrator
          </div>
        </header>

        <main className="p-6">
          {loading ? (
            <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
          ) : (
            <>
              {tab === 'overview' && <Overview elections={elections} candidates={candidates} users={users} ballots={ballots} batches={batches} />}
              {tab === 'election' && <ElectionTab data={elections} onCreate={() => openCreate('election')} onEdit={(r) => openEdit('election', r)} onDelete={(r) => setConfirmDel({ entity: 'election', id: r.id, label: r.name })} />}
              {tab === 'candidate' && <CandidateTab data={candidates} onCreate={() => openCreate('candidate')} onEdit={(r) => openEdit('candidate', r)} onDelete={(r) => setConfirmDel({ entity: 'candidate', id: r.id, label: r.user_name || r.initials })} />}
              {tab === 'batch' && <BatchTab data={batches} onCreate={() => openCreate('batch')} onEdit={(r) => openEdit('batch', r)} onDelete={(r) => setConfirmDel({ entity: 'batch', id: r.id, label: r.name })} onImport={() => setImportEntity('batch')} />}
              {tab === 'user' && <UserTab data={users} batches={batches} onCreate={() => openCreate('user')} onEdit={(r) => openEdit('user', r)} onDelete={(r) => setConfirmDel({ entity: 'user', id: r.id, label: r.name || r.email })} onImport={() => setImportEntity('user')} />}
              {tab === 'result' && <ResultTab elections={elections} candidates={candidates} ballots={ballots} />}
            </>
          )}
        </main>
      </div>

      {/* FORM MODAL */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create' ? 'Tambah' : 'Ubah'} {NAV.find((n) => n.key === modal.entity)?.label || modal.entity}
                </DialogTitle>
                <DialogDescription>Lengkapi formulir di bawah ini.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <FormFields modal={modal} setVal={setVal} elections={elections} users={users} batches={batches} />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
                <Button type="submit" className="bg-navy hover:bg-navy-light text-white" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !deleting && !o && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-navy">Hapus Data</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <span className="font-semibold text-navy">{confirmDel?.label}</span>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDel(null)} disabled={deleting}>Batal</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menghapus...</> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT CSV MODAL */}
      <ImportDialog entity={importEntity} onClose={() => setImportEntity(null)} onImport={doImport} batches={batches} />
    </div>
  )
}

// ---------------- helpers ----------------
function defaultValues(entity) {
  if (entity === 'election') return { name: '', description: '', start_time: '', end_time: '' }
  if (entity === 'candidate') return { id_user: '', id_election: '', initials: '', vision: '', mission: '' }
  if (entity === 'batch') return { name: '', branch: '', number: '' }
  if (entity === 'user') return { name: '', email: '', password: '', id_batch: '', number: '' }
  return {}
}
function toFormValues(entity, row) {
  if (entity === 'election') return { id: row.id, name: row.name || '', description: row.description || '', start_time: toInputDate(row.start_time), end_time: toInputDate(row.end_time) }
  if (entity === 'candidate') return { id: row.id, id_user: '', id_election: '', initials: row.initials || '', vision: row.vision || '', mission: row.mission || '' }
  if (entity === 'batch') return { id: row.id, name: row.name || '', branch: row.branch || '', number: row.number ?? '' }
  if (entity === 'user') return { id: row.id, name: row.name || '', number: row.number || '' }
  return { ...row }
}

function FormFields({ modal, setVal, elections, users, batches }) {
  const { entity, mode, values } = modal
  if (entity === 'election') return (
    <>
      <Field label="Nama Pemilihan"><Input value={values.name} onChange={(e) => setVal('name', e.target.value)} required placeholder="Pemilihan Ketua IKA 2025" /></Field>
      <Field label="Deskripsi"><Textarea value={values.description} onChange={(e) => setVal('description', e.target.value)} rows={3} placeholder="Deskripsi singkat pemilihan" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Waktu Mulai"><Input type="datetime-local" value={values.start_time} onChange={(e) => setVal('start_time', e.target.value)} required={mode === 'create'} /></Field>
        <Field label="Waktu Selesai"><Input type="datetime-local" value={values.end_time} onChange={(e) => setVal('end_time', e.target.value)} required /></Field>
      </div>
    </>
  )
  if (entity === 'candidate') return (
    <>
      <Field label="Pengguna (Kandidat)">
        <Select value={String(values.id_user)} onValueChange={(v) => setVal('id_user', v)}>
          <SelectTrigger><SelectValue placeholder="Pilih pengguna" /></SelectTrigger>
          <SelectContent>{users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email} ({u.role})</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Pemilihan">
        <Select value={String(values.id_election)} onValueChange={(v) => setVal('id_election', v)}>
          <SelectTrigger><SelectValue placeholder="Pilih pemilihan" /></SelectTrigger>
          <SelectContent>{elections.map((el) => <SelectItem key={el.id} value={String(el.id)}>{el.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Inisial / Nomor Urut"><Input value={values.initials} onChange={(e) => setVal('initials', e.target.value)} required placeholder="01 / A" /></Field>
      <Field label="Visi"><Textarea value={values.vision} onChange={(e) => setVal('vision', e.target.value)} rows={3} required /></Field>
      <Field label="Misi"><Textarea value={values.mission} onChange={(e) => setVal('mission', e.target.value)} rows={4} required /></Field>
    </>
  )
  if (entity === 'batch') return (
    <>
      <Field label="Nama Angkatan"><Input value={values.name} onChange={(e) => setVal('name', e.target.value)} required placeholder="Andromeda" /></Field>
      <Field label="Cabang / Kampus"><Input value={values.branch} onChange={(e) => setVal('branch', e.target.value)} required placeholder="Deli Serdang" /></Field>
      <Field label="Nomor Angkatan"><Input type="number" value={values.number} onChange={(e) => setVal('number', e.target.value)} required placeholder="11" /></Field>
    </>
  )
  if (entity === 'user') return (
    <>
      <Field label="Nama Lengkap"><Input value={values.name} onChange={(e) => setVal('name', e.target.value)} required /></Field>
      {mode === 'create' && (
        <>
          <Field label="Email"><Input type="email" value={values.email} onChange={(e) => setVal('email', e.target.value)} required /></Field>
          <Field label="Kata Sandi"><Input type="text" value={values.password} onChange={(e) => setVal('password', e.target.value)} required placeholder="Kata sandi awal" /></Field>
          <Field label="Angkatan">
            <Select value={String(values.id_batch)} onValueChange={(v) => setVal('id_batch', v)}>
              <SelectTrigger><SelectValue placeholder="Pilih angkatan" /></SelectTrigger>
              <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name} (No. {b.number})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </>
      )}
      <Field label="Nomor HP / NIS"><Input value={values.number} onChange={(e) => setVal('number', e.target.value)} placeholder="08xxxx" /></Field>
    </>
  )
  return null
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
}

function TableToolbar({ title, desc, count, onCreate, createLabel, onImport, importLabel }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
      <div>
        <h2 className="font-serif text-lg text-navy">{title} <span className="text-muted-foreground text-sm font-sans">({count})</span></h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onImport && <Button variant="outline" className="border-navy/20 text-navy hover:bg-navy/5" onClick={onImport}><Upload className="h-4 w-4 mr-2" /> {importLabel || 'Impor CSV'}</Button>}
        {onCreate && <Button className="bg-navy hover:bg-navy-light text-white" onClick={onCreate}><Plus className="h-4 w-4 mr-2" /> {createLabel}</Button>}
      </div>
    </div>
  )
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      {onEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-navy" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>}
      {onDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
    </div>
  )
}

function EmptyRow({ span, text }) {
  return <TableRow><TableCell colSpan={span} className="text-center text-muted-foreground py-10">{text}</TableCell></TableRow>
}

const statusBadge = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  ended: 'bg-slate-100 text-slate-600 border-slate-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
}

// ---------------- Tabs ----------------
function Overview({ elections, candidates, users, ballots, batches }) {
  const stats = [
    { label: 'Total Pemilihan', value: elections.length, icon: CalendarDays },
    { label: 'Total Kandidat', value: candidates.length, icon: UserSquare2 },
    { label: 'Total Pengguna', value: users.length, icon: Users2 },
    { label: 'Suara Masuk', value: ballots.length, icon: Vote },
  ]
  const activeEl = elections.find((e) => electionStatus(e) === 'active')
  const chartData = useMemo(() => {
    const counts = {}
    ballots.forEach((b) => { counts[b.candidate_id] = (counts[b.candidate_id] || 0) + 1 })
    return candidates.map((c) => ({ name: c.user_name || c.initials || `#${c.id}`, suara: counts[c.id] || 0 }))
  }, [ballots, candidates])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="border-border/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-navy/5 border border-border flex items-center justify-center"><s.icon className="h-5 w-5 text-gold-dark" /></div>
              </div>
              <div className="text-3xl font-serif text-navy">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70">
        <CardContent className="p-6">
          <h3 className="font-serif text-lg text-navy mb-1">Perolehan Suara</h3>
          <p className="text-sm text-muted-foreground mb-5">Jumlah suara masuk untuk setiap kandidat.</p>
          {chartData.length === 0 || chartData.every((d) => d.suara === 0) ? (
            <div className="py-12 text-center text-muted-foreground">Belum ada suara yang masuk.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="suara" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {activeEl && (
        <Card className="border-border/70 bg-navy text-white">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <Badge className="mb-2 bg-emerald-500/20 text-emerald-300 border-emerald-400/30">Sedang Berlangsung</Badge>
              <h3 className="font-serif text-xl">{activeEl.name}</h3>
              <p className="text-white/60 text-sm">Berakhir {fmtDate(activeEl.end_time)}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-serif text-gold">{ballots.filter((b) => String(b.election_id) === String(activeEl.id)).length}</div>
              <div className="text-white/60 text-sm">suara masuk</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ElectionTab({ data, onCreate, onEdit, onDelete }) {
  return (
    <Card className="border-border/70"><CardContent className="p-6">
      <TableToolbar title="Daftar Pemilihan" desc="Kelola agenda pemungutan suara." count={data.length} onCreate={onCreate} createLabel="Tambah Pemilihan" />
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nama</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? <EmptyRow span={5} text="Belum ada pemilihan." /> : data.map((e) => {
              const st = electionStatus(e)
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-navy">{e.name}</TableCell>
                  <TableCell className="text-sm">{fmtDate(e.start_time)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(e.end_time)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge[st]}>{STATUS_LABEL[st]}</Badge></TableCell>
                  <TableCell><RowActions onEdit={() => onEdit(e)} onDelete={() => onDelete(e)} /></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  )
}

function CandidateTab({ data, onCreate, onEdit, onDelete }) {
  return (
    <Card className="border-border/70"><CardContent className="p-6">
      <TableToolbar title="Daftar Kandidat" desc="Kelola kandidat beserta visi & misi." count={data.length} onCreate={onCreate} createLabel="Tambah Kandidat" />
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Inisial</TableHead><TableHead>Nama</TableHead><TableHead>Angkatan</TableHead><TableHead>Pemilihan</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? <EmptyRow span={5} text="Belum ada kandidat." /> : data.map((c) => (
              <TableRow key={c.id}>
                <TableCell><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-gold text-xs font-semibold">{(c.initials || '?').toString().slice(0, 2)}</span></TableCell>
                <TableCell className="font-medium text-navy">{c.user_name || '-'}</TableCell>
                <TableCell className="text-sm">{c.batch_name || '-'}</TableCell>
                <TableCell className="text-sm">{c.election_name || '-'}</TableCell>
                <TableCell><RowActions onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  )
}

function BatchTab({ data, onCreate, onEdit, onDelete, onImport }) {
  return (
    <Card className="border-border/70"><CardContent className="p-6">
      <TableToolbar title="Daftar Angkatan" desc="Kelola data angkatan alumni." count={data.length} onCreate={onCreate} createLabel="Tambah Angkatan" onImport={onImport} />
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No.</TableHead><TableHead>Nama Angkatan</TableHead><TableHead>Cabang</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? <EmptyRow span={4} text="Belum ada angkatan." /> : data.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium text-navy">{b.number}</TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.branch}</TableCell>
                <TableCell><RowActions onEdit={() => onEdit(b)} onDelete={() => onDelete(b)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  )
}

function UserTab({ data, batches, onCreate, onEdit, onDelete, onImport }) {
  const batchName = (id) => batches.find((b) => b.id === id)?.name || (id ? `#${id}` : '-')
  return (
    <Card className="border-border/70"><CardContent className="p-6">
      <TableToolbar title="Daftar Pengguna" desc="Kelola akun alumni & administrator." count={data.length} onCreate={onCreate} createLabel="Tambah Pengguna" onImport={onImport} />
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Angkatan</TableHead><TableHead>Peran</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? <EmptyRow span={5} text="Belum ada pengguna." /> : data.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-navy">{u.name || '-'}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{batchName(u.id_batch)}</TableCell>
                <TableCell><Badge variant="outline" className={u.role === 'admin' ? 'bg-gold/15 text-gold-dark border-gold/30' : 'bg-slate-100 text-slate-600 border-slate-200'}>{u.role}</Badge></TableCell>
                <TableCell><RowActions onEdit={() => onEdit(u)} onDelete={() => onDelete(u)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  )
}

function ResultTab({ elections, candidates, ballots }) {
  const [electionId, setElectionId] = useState(elections[0] ? String(elections[0].id) : '')
  const selEl = elections.find((e) => String(e.id) === electionId)
  const cands = candidates.filter((c) => (c.election_name || '').trim() === (selEl?.name || '').trim())
  const counts = {}
  ballots.forEach((b) => { if (!selEl || String(b.election_id) === String(selEl.id)) counts[b.candidate_id] = (counts[b.candidate_id] || 0) + 1 })
  const total = cands.reduce((a, c) => a + (counts[c.id] || 0), 0)
  const ranked = [...cands].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
  const leader = ranked[0]

  return (
    <div className="space-y-6">
      <Card className="border-border/70"><CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="font-serif text-lg text-navy">Rekapitulasi Suara</h2>
            <p className="text-sm text-muted-foreground">Total {total} suara sah untuk pemilihan terpilih.</p>
          </div>
          <div className="w-64">
            <Select value={electionId} onValueChange={setElectionId}>
              <SelectTrigger><SelectValue placeholder="Pilih pemilihan" /></SelectTrigger>
              <SelectContent>{elections.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardContent></Card>

      {leader && total > 0 && (
        <Card className="border-gold/40 bg-gold/5"><CardContent className="p-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center"><Trophy className="h-7 w-7 text-gold-dark" /></div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gold-dark font-semibold">Perolehan Suara Tertinggi</div>
            <div className="font-serif text-xl text-navy">{leader.user_name || leader.initials}</div>
            <div className="text-sm text-muted-foreground">{counts[leader.id] || 0} suara ({total ? Math.round(((counts[leader.id] || 0) / total) * 100) : 0}%)</div>
          </div>
        </CardContent></Card>
      )}

      <Card className="border-border/70"><CardContent className="p-6 space-y-5">
        {cands.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Belum ada kandidat untuk pemilihan ini.</div>
        ) : ranked.map((c, i) => {
          const v = counts[c.id] || 0
          const pct = total ? Math.round((v / total) * 100) : 0
          return (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-gold text-xs font-semibold">{i + 1}</span>
                  <span className="font-medium text-navy">{c.user_name || c.initials}</span>
                </div>
                <span className="text-sm text-muted-foreground">{v} suara · {pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              </div>
            </div>
          )
        })}
      </CardContent></Card>
    </div>
  )
}


// ---------------- CSV Import ----------------
function parseCSV(text) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!clean) return { headers: [], rows: [] }
  const lines = clean.split('\n').filter((l) => l.trim() !== '')
  const splitLine = (line) => {
    const out = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ
      } else if (ch === ',' && !inQ) { out.push(cur); cur = '' } else cur += ch
    }
    out.push(cur)
    return out.map((s) => s.trim())
  }
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map((l) => {
    const cells = splitLine(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

const IMPORT_CONFIG = {
  user: {
    title: 'Impor Pengguna (CSV)',
    cols: ['name', 'email', 'password', 'id_batch', 'number'],
    template: 'name,email,password,id_batch,number\nBudi Santoso,budi@email.com,password123,9,081200000010\nSiti Aminah,siti@email.com,password123,10,081200000011',
    map: (r) => ({ name: r.name, email: r.email, password: r.password, id_batch: Number(r.id_batch) || 0, number: String(r.number || '') }),
    valid: (o) => o.name && o.email && o.password,
  },
  batch: {
    title: 'Impor Angkatan (CSV)',
    cols: ['name', 'branch', 'number'],
    template: 'name,branch,number\nNebula,Deli Serdang,15\nOrion,Deli Serdang,16',
    map: (r) => ({ name: r.name, branch: r.branch, number: Number(r.number) || 0 }),
    valid: (o) => o.name && o.branch,
  },
}

function ImportDialog({ entity, onClose, onImport }) {
  const cfg = entity ? IMPORT_CONFIG[entity] : null
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setRaw('') }, [entity])

  const parsed = cfg && raw ? parseCSV(raw) : { headers: [], rows: [] }
  const mapped = cfg ? parsed.rows.map(cfg.map) : []
  const validRows = cfg ? mapped.filter(cfg.valid) : []

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const txt = await f.text()
    setRaw(txt)
  }

  const submit = async () => {
    if (validRows.length === 0) { toast.error('Tidak ada baris valid untuk diimpor'); return }
    setBusy(true)
    try {
      await onImport(entity, validRows)
      toast.success(`${validRows.length} data berhasil diimpor`)
    } catch (err) {
      toast.error(err.message || 'Gagal mengimpor data')
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([cfg.template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${entity}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={!!entity} onOpenChange={(o) => !busy && !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {cfg && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-navy flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-gold-dark" /> {cfg.title}</DialogTitle>
              <DialogDescription>
                Unggah berkas CSV dengan kolom: <span className="font-mono text-navy">{cfg.cols.join(', ')}</span>. Baris pertama harus berupa header.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center gap-3">
                <Input type="file" accept=".csv,text/csv" onChange={onFile} className="max-w-xs" />
                <Button type="button" variant="outline" size="sm" className="border-navy/20 text-navy hover:bg-navy/5" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" /> Unduh Template
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Atau tempel data CSV di sini</Label>
                <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={cfg.template} className="font-mono text-xs mt-1" />
              </div>
              {raw && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-secondary px-4 py-2 text-sm flex items-center justify-between">
                    <span className="font-medium text-navy">Pratinjau</span>
                    <span className="text-muted-foreground">{validRows.length} baris valid dari {parsed.rows.length} baris</span>
                  </div>
                  <div className="max-h-52 overflow-auto">
                    <Table>
                      <TableHeader><TableRow>{cfg.cols.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {mapped.slice(0, 50).map((r, i) => (
                          <TableRow key={i} className={cfg.valid(r) ? '' : 'bg-destructive/5'}>
                            {cfg.cols.map((c) => <TableCell key={c} className="text-xs">{String(r[c] ?? '')}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
              <Button className="bg-navy hover:bg-navy-light text-white" onClick={submit} disabled={busy || validRows.length === 0}>
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengimpor...</> : <><Upload className="h-4 w-4 mr-2" /> Impor {validRows.length > 0 ? `(${validRows.length})` : ''}</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
