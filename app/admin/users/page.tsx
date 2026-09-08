'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Loader2, Search, Filter, X } from 'lucide-react'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog, ImportDialog,
} from '@/components/admin/admin-shared'

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])

  // Filter States
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; values: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ id: number | string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [uRes, bRes] = await Promise.all([
        apiFetch('/admin/users').catch(() => ({ data: [] })),
        apiFetch('/admin/batches').catch(() => ({ data: [] })),
      ])
      setUsers(Array.isArray(uRes?.data) ? uRes.data : [])
      setBatches(Array.isArray(bRes?.data) ? bRes.data : [])
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat daftar pengguna')
    } finally {
      setLoading(false)
    }
  }

  const batchName = (id: any) =>
    batches.find((b) => String(b.id) === String(id))?.name || (id ? `#${id}` : '-')

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search text (Name, Email, Number)
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = (u.name || '').toLowerCase().includes(q)
        const emailMatch = (u.email || '').toLowerCase().includes(q)
        const numberMatch = (u.number || '').toLowerCase().includes(q)
        if (!nameMatch && !emailMatch && !numberMatch) return false
      }

      // Batch filter
      if (batchFilter !== 'ALL') {
        if (String(u.id_batch) !== String(batchFilter)) return false
      }

      // Role filter
      if (roleFilter !== 'ALL') {
        if (u.role !== roleFilter) return false
      }

      return true
    })
  }, [users, search, batchFilter, roleFilter])

  const isFiltered = search.trim() !== '' || batchFilter !== 'ALL' || roleFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setBatchFilter('ALL')
    setRoleFilter('ALL')
  }

  const openCreate = () => {
    setModal({
      mode: 'create',
      values: { name: '', email: '', password: '', id_batch: '', number: '', role: 'voter' },
    })
  }

  const openEdit = (row: any) => {
    setModal({
      mode: 'edit',
      values: {
        id: row.id,
        name: row.name || '',
        email: row.email || '',
        password: '',
        id_batch: row.id_batch ? String(row.id_batch) : '',
        number: row.number || '',
        role: row.role || 'voter',
      },
    })
  }

  const setVal = (k: string, val: any) => {
    setModal((m) => m ? { ...m, values: { ...m.values, [k]: val } } : null)
  }

  const submitModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modal) return
    const { mode, values } = modal

    const emailClean = (values.email || '').trim()
    const numberClean = (values.number || '').trim()

    if (!emailClean && !numberClean) {
      toast.error('Minimal satu dari Email atau Nomor Telepon / HP harus diisi')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: values.name.trim(),
        email: emailClean || null,
        number: numberClean || null,
        role: values.role || 'voter',
        id_batch: values.role === 'admin' ? 0 : (values.id_batch ? Number(values.id_batch) : 0),
      }
      if (mode === 'create') {
        payload.password = values.password
      } else if (values.password) {
        payload.password = values.password
      }

      if (mode === 'create') {
        await apiFetch('/admin/user', { method: 'POST', body: payload })
        toast.success('Pengguna berhasil ditambahkan')
      } else {
        await apiFetch(`/admin/user/${values.id}`, { method: 'PUT', body: payload })
        toast.success('Pengguna berhasil diperbarui')
      }
      setModal(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengguna')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/user/${confirmDel.id}`, { method: 'DELETE' })
      toast.success('Pengguna berhasil dihapus')
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pengguna')
    } finally {
      setDeleting(false)
    }
  }

  const doImport = async (_entity: string, rows: any[]) => {
    await apiFetch('/admin/users', { method: 'POST', body: rows })
    setShowImport(false)
    await loadData()
  }

  if (loading) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardContent className="p-6">
          <TableToolbar
            title="Daftar Pengguna"
            desc="Kelola akun alumni, hak akses, angkatan, dan administrator sistem."
            count={users.length}
            onCreate={openCreate}
            createLabel="Tambah Pengguna"
            onImport={() => setShowImport(true)}
            importLabel="Impor CSV"
          />

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center gap-3 my-4">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, nomor HP..."
                className="pl-9"
              />
            </div>

            {/* Angkatan Filter */}
            <div className="w-52">
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Angkatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Angkatan</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name} (No. {b.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter */}
            <div className="w-40">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Peran</SelectItem>
                  <SelectItem value="voter">Voter (Pemilih)</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-navy"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset Filter
              </Button>
            )}
          </div>

          {/* TABLE */}
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email / No. HP</TableHead>
                  <TableHead>Angkatan</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <EmptyRow
                    span={5}
                    text={
                      isFiltered
                        ? 'Tidak ada pengguna yang cocok dengan kriteria filter.'
                        : 'Belum ada data pengguna.'
                    }
                  />
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-navy">{u.name || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {u.email && <div>{u.email}</div>}
                        {u.number && <div className="text-xs text-muted-foreground font-mono">{u.number}</div>}
                        {!u.email && !u.number && <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">{batchName(u.id_batch)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            u.role === 'admin'
                              ? 'bg-gold/15 text-gold-dark border-gold/30'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <RowActions
                          onEdit={() => openEdit(u)}
                          onDelete={() => setConfirmDel({ id: u.id, label: u.name || u.email || u.number })}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {isFiltered && (
            <div className="text-xs text-muted-foreground mt-3">
              Menampilkan {filteredUsers.length} dari {users.length} pengguna terdaftar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL TAMBAH / UBAH */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-md">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create' ? 'Tambah Pengguna' : 'Ubah Pengguna'}
                </DialogTitle>
                <DialogDescription>
                  Lengkapi rincian profil akun di bawah ini. Pengguna dapat memiliki Email, Nomor Telepon/HP, atau keduanya.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Field label="Nama Lengkap">
                  <Input
                    value={modal.values.name}
                    onChange={(e) => setVal('name', e.target.value)}
                    required
                    placeholder="Nama lengkap"
                  />
                </Field>

                <Field label="Email">
                  <Input
                    type="email"
                    value={modal.values.email}
                    onChange={(e) => setVal('email', e.target.value)}
                    placeholder="nama@email.com (opsional jika No. HP diisi)"
                  />
                </Field>

                <Field label="Nomor Telepon / HP">
                  <Input
                    value={modal.values.number}
                    onChange={(e) => setVal('number', e.target.value)}
                    placeholder="08xxxxxxxxxx (opsional jika Email diisi)"
                  />
                </Field>

                <Field label="Peran (Role)">
                  <Select
                    value={modal.values.role || 'voter'}
                    onValueChange={(v) => {
                      setVal('role', v)
                      if (v === 'admin') setVal('id_batch', '')
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih peran" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voter">Voter (Pemilih Alumni)</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {modal.values.role !== 'admin' && (
                  <Field label="Angkatan">
                    <Select
                      value={String(modal.values.id_batch || '')}
                      onValueChange={(v) => setVal('id_batch', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih angkatan" /></SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name} (No. {b.number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field label={modal.mode === 'create' ? 'Kata Sandi' : 'Kata Sandi (Opsional)'}>
                  <Input
                    type="text"
                    value={modal.values.password}
                    onChange={(e) => setVal('password', e.target.value)}
                    required={modal.mode === 'create'}
                    placeholder={modal.mode === 'create' ? 'Kata sandi awal' : 'Kosongkan jika tidak ingin mengubah'}
                  />
                </Field>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
                <Button className="bg-navy hover:bg-navy-light text-white" type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Pengguna'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE */}
      <ConfirmDeleteDialog
        target={confirmDel}
        deleting={deleting}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {/* IMPORT CSV */}
      <ImportDialog
        entity={showImport ? 'user' : null}
        onClose={() => setShowImport(false)}
        onImport={doImport}
      />
    </div>
  )
}

