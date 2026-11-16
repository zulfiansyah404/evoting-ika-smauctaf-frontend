'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch, getSession, UserSession } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog, ImportDialog,
  BulkActionToolbar, ConfirmBulkDeleteDialog,
} from '@/components/admin/admin-shared'
import { TablePagination } from '@/components/admin/table-pagination'

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])

  // Filter & Search States
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [batchFilter, setBatchFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')

  // Pagination State
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 })

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; values: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ id: number | string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkDel, setShowBulkDel] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const isOperator = currentUser?.role === 'operator'

  // Load batches and current user on mount
  useEffect(() => {
    setCurrentUser(getSession())
    apiFetch('/admin/batches')
      .then((bRes) => setBatches(Array.isArray(bRes?.data) ? bRes.data : []))
      .catch(() => {})
  }, [])

  // Reset to page 1 whenever search query or filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, batchFilter, roleFilter])

  // Server-side data fetching callback
  const loadData = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (batchFilter !== 'ALL') params.set('id_batch', batchFilter)
      if (roleFilter !== 'ALL') params.set('role', roleFilter)

      const res = await apiFetch(`/admin/users?${params.toString()}`)
      setUsers(Array.isArray(res?.data) ? res.data : [])
      if (res?.meta) {
        setMeta(res.meta)
      } else {
        setMeta({
          page: 1,
          limit: 10,
          total: Array.isArray(res?.data) ? res.data.length : 0,
          total_pages: 1,
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat daftar pengguna')
    } finally {
      setLoadingUsers(false)
      setInitialLoading(false)
    }
  }, [page, debouncedSearch, batchFilter, roleFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const batchName = (id: any) =>
    batches.find((b) => String(b.id) === String(id))?.name || (id ? `#${id}` : '-')

  const isFiltered = search.trim() !== '' || batchFilter !== 'ALL' || roleFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setBatchFilter('ALL')
    setRoleFilter('ALL')
    setPage(1)
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

    const effectiveRole = isOperator ? 'voter' : (values.role || 'voter')

    if (effectiveRole === 'voter' && !values.id_batch) {
      toast.error('Angkatan wajib dipilih untuk pemilih (voter)')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: values.name.trim(),
        email: emailClean || null,
        number: numberClean || null,
        role: effectiveRole,
        id_batch: effectiveRole === 'voter' ? (values.id_batch ? String(values.id_batch).trim() : null) : null,
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
      setSelectedIds((prev) => prev.filter((id) => id !== String(confirmDel.id)))
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pengguna')
    } finally {
      setDeleting(false)
    }
  }

  const selectableUsers = useMemo(() => {
    return isOperator ? users.filter((u) => u.role === 'voter') : users
  }, [users, isOperator])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(selectableUsers.map((u) => String(u.id)))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const isAllSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.includes(String(u.id)))
  const isSomeSelected = selectableUsers.some((u) => selectedIds.includes(String(u.id))) && !isAllSelected

  const doBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await apiFetch('/admin/users/bulk-delete', { method: 'POST', body: { ids: selectedIds } })
      toast.success(`${selectedIds.length} pengguna berhasil dihapus`)
      setSelectedIds([])
      setShowBulkDel(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pengguna')
    } finally {
      setBulkDeleting(false)
    }
  }

  const doImport = async (_entity: string, rows: any[]) => {
    await apiFetch('/admin/users', { method: 'POST', body: rows })
    setShowImport(false)
    await loadData()
  }

  if (initialLoading) {
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
            title={isOperator ? 'Daftar Pemilih (Voter)' : 'Daftar Pengguna'}
            desc={
              isOperator
                ? 'Input, impor, dan kelola data akun pemilih (voter) alumni.'
                : 'Kelola akun alumni, hak akses, angkatan, dan administrator sistem.'
            }
            count={meta.total}
            onCreate={openCreate}
            createLabel={isOperator ? 'Tambah Voter' : 'Tambah Pengguna'}
            onImport={() => setShowImport(true)}
            importLabel="Impor CSV"
          />

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center gap-3 my-4">
            {/* Search input with Debounce */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, nomor HP..."
                className="pl-9 pr-9"
              />
              {loadingUsers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
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

            {/* Role Filter (Hanya tampil jika bukan operator) */}
            {!isOperator && (
              <div className="w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Peran</SelectItem>
                    <SelectItem value="voter">Voter (Pemilih)</SelectItem>
                    <SelectItem value="operator">Operator (Petugas Voter)</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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

          {/* BULK ACTION TOOLBAR */}
          <BulkActionToolbar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={() => setShowBulkDel(true)}
            entityLabel="pengguna"
          />

          {/* TABLE */}
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table className={loadingUsers ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                      onCheckedChange={(c) => toggleSelectAll(!!c)}
                      aria-label="Pilih semua baris di halaman ini"
                    />
                  </TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email / No. HP</TableHead>
                  <TableHead>Angkatan</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <EmptyRow
                    span={6}
                    text={
                      isFiltered
                        ? 'Tidak ada pengguna yang cocok dengan kriteria pencarian/filter.'
                        : 'Belum ada data pengguna.'
                    }
                  />
                ) : (
                  users.map((u) => {
                    const isSelected = selectedIds.includes(String(u.id))
                    const isLockedForOperator = isOperator && u.role !== 'voter'
                    return (
                      <TableRow key={u.id} data-state={isSelected ? 'selected' : undefined}>
                        <TableCell className="text-center">
                          {isLockedForOperator ? (
                            <Checkbox disabled checked={false} aria-label="Terkunci" />
                          ) : (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(c) => toggleSelectRow(String(u.id), !!c)}
                              aria-label={`Pilih ${u.name || u.email}`}
                            />
                          )}
                        </TableCell>
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
                                : u.role === 'operator'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }
                          >
                            {u.role === 'operator' ? 'Operator' : u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isLockedForOperator ? (
                            <span className="text-xs text-muted-foreground italic">Terkunci</span>
                          ) : (
                            <RowActions
                              onEdit={() => openEdit(u)}
                              onDelete={() => setConfirmDel({ id: u.id, label: u.name || u.email || u.number })}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* TABLE PAGINATION */}
          <TablePagination
            page={meta.page}
            totalPages={meta.total_pages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setPage(p)}
            disabled={loadingUsers}
          />
        </CardContent>
      </Card>

      {/* MODAL TAMBAH / UBAH */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-md">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create'
                    ? (isOperator ? 'Tambah Voter' : 'Tambah Pengguna')
                    : (isOperator ? 'Ubah Voter' : 'Ubah Pengguna')}
                </DialogTitle>
                <DialogDescription>
                  {isOperator
                    ? 'Lengkapi rincian profil akun voter di bawah ini.'
                    : 'Lengkapi rincian profil akun di bawah ini. Pengguna dapat memiliki Email, Nomor Telepon/HP, atau keduanya.'}
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

                {!isOperator && (
                  <Field label="Peran (Role)">
                    <Select
                      value={modal.values.role || 'voter'}
                      onValueChange={(v) => {
                        setVal('role', v)
                        if (v === 'admin' || v === 'operator') setVal('id_batch', '')
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih peran" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voter">Voter (Pemilih Alumni)</SelectItem>
                        <SelectItem value="operator">Operator (Petugas Voter)</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {(isOperator || modal.values.role === 'voter') && (
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
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
                  ) : (
                    isOperator ? 'Simpan Voter' : 'Simpan Pengguna'
                  )}
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

      {/* CONFIRM BULK DELETE */}
      <ConfirmBulkDeleteDialog
        open={showBulkDel}
        count={selectedIds.length}
        deleting={bulkDeleting}
        entityLabel="pengguna"
        onClose={() => setShowBulkDel(false)}
        onConfirm={doBulkDelete}
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

