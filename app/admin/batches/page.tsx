'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Loader2, Search, X } from 'lucide-react'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog, ImportDialog,
} from '@/components/admin/admin-shared'

export default function AdminBatchesPage() {
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<any[]>([])

  // Filter states
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('ALL')

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
      const res = await apiFetch('/admin/batches').catch(() => ({ data: [] }))
      setBatches(Array.isArray(res?.data) ? res.data : [])
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat angkatan')
    } finally {
      setLoading(false)
    }
  }

  // Branches list for dropdown filter
  const branchOptions = useMemo(() => {
    const set = new Set<string>()
    batches.forEach((b) => {
      if (b.branch) set.add(b.branch)
    })
    return Array.from(set)
  }, [batches])

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = (b.name || '').toLowerCase().includes(q)
        const numMatch = String(b.number || '').toLowerCase().includes(q)
        const branchMatch = (b.branch || '').toLowerCase().includes(q)
        if (!nameMatch && !numMatch && !branchMatch) return false
      }

      if (branchFilter !== 'ALL') {
        if ((b.branch || '').trim() !== (branchFilter || '').trim()) return false
      }

      return true
    })
  }, [batches, search, branchFilter])

  const isFiltered = search.trim() !== '' || branchFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setBranchFilter('ALL')
  }

  const openCreate = () => {
    setModal({
      mode: 'create',
      values: { name: '', branch: '', number: '' },
    })
  }

  const openEdit = (row: any) => {
    setModal({
      mode: 'edit',
      values: {
        id: row.id,
        name: row.name || '',
        branch: row.branch || '',
        number: row.number ?? '',
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
    setSaving(true)
    try {
      const payload = {
        name: values.name,
        branch: values.branch,
        number: Number(values.number),
      }

      if (mode === 'create') {
        await apiFetch('/admin/batch', { method: 'POST', body: payload })
        toast.success('Angkatan berhasil ditambahkan')
      } else {
        await apiFetch(`/admin/batch/${values.id}`, { method: 'PUT', body: payload })
        toast.success('Angkatan berhasil diperbarui')
      }
      setModal(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan angkatan')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/batch/${confirmDel.id}`, { method: 'DELETE' })
      toast.success('Angkatan berhasil dihapus')
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus angkatan')
    } finally {
      setDeleting(false)
    }
  }

  const doImport = async (_entity: string, rows: any[]) => {
    await apiFetch('/admin/batches', { method: 'POST', body: rows })
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
            title="Daftar Angkatan"
            desc="Kelola data nomor dan nama angkatan alumni SMA Unggulan CT Foundation."
            count={batches.length}
            onCreate={openCreate}
            createLabel="Tambah Angkatan"
            onImport={() => setShowImport(true)}
            importLabel="Impor CSV"
          />

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center gap-3 my-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau nomor angkatan..."
                className="pl-9"
              />
            </div>

            <div className="w-52">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Cabang / Kampus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Cabang</SelectItem>
                  {branchOptions.map((br) => (
                    <SelectItem key={br} value={br}>
                      {br}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Nama Angkatan</TableHead>
                  <TableHead>Cabang / Kampus</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <EmptyRow
                    span={4}
                    text={
                      isFiltered
                        ? 'Tidak ada angkatan yang cocok dengan kriteria filter.'
                        : 'Belum ada data angkatan.'
                    }
                  />
                ) : (
                  filteredBatches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-navy">{b.number}</TableCell>
                      <TableCell>{b.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.branch}</TableCell>
                      <TableCell>
                        <RowActions
                          onEdit={() => openEdit(b)}
                          onDelete={() => setConfirmDel({ id: b.id, label: `${b.name} (No. ${b.number})` })}
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
              Menampilkan {filteredBatches.length} dari {batches.length} angkatan terdaftar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL TAMBAH / UBAH */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create' ? 'Tambah Angkatan' : 'Ubah Angkatan'}
                </DialogTitle>
                <DialogDescription>Lengkapi data angkatan alumni di bawah ini.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Field label="Nama Angkatan">
                  <Input
                    value={modal.values.name}
                    onChange={(e) => setVal('name', e.target.value)}
                    required
                    placeholder="Andromeda"
                  />
                </Field>
                <Field label="Cabang / Kampus">
                  <Input
                    value={modal.values.branch}
                    onChange={(e) => setVal('branch', e.target.value)}
                    required
                    placeholder="Deli Serdang"
                  />
                </Field>
                <Field label="Nomor Angkatan">
                  <Input
                    type="number"
                    value={modal.values.number}
                    onChange={(e) => setVal('number', e.target.value)}
                    required
                    placeholder="11"
                  />
                </Field>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
                <Button className="bg-navy hover:bg-navy-light text-white" type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Angkatan'}
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

      {/* IMPORT CSV DIALOG */}
      <ImportDialog
        entity={showImport ? 'batch' : null}
        onClose={() => setShowImport(false)}
        onImport={doImport}
      />
    </div>
  )
}

