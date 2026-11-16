'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog, ImportDialog,
  BulkActionToolbar, ConfirmBulkDeleteDialog,
} from '@/components/admin/admin-shared'
import { TablePagination } from '@/components/admin/table-pagination'

export default function AdminBatchesPage() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [branchOptions, setBranchOptions] = useState<string[]>(['Deli Serdang', 'Sukoharjo'])

  // Filter states
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [branchFilter, setBranchFilter] = useState('ALL')

  // Pagination state
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

  // Load all branches for dropdown options on mount
  useEffect(() => {
    apiFetch('/admin/batches?all=true')
      .then((res) => {
        if (Array.isArray(res?.data)) {
          const set = new Set<string>(['Deli Serdang', 'Sukoharjo'])
          res.data.forEach((b: any) => {
            if (b.branch) set.add(b.branch)
          })
          setBranchOptions(Array.from(set))
        }
      })
      .catch(() => {})
  }, [])

  // Reset page to 1 whenever search query or branch filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, branchFilter])

  // Server-side data fetching
  const loadData = useCallback(async () => {
    setLoadingBatches(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (branchFilter !== 'ALL') params.set('branch', branchFilter)

      const res = await apiFetch(`/admin/batches?${params.toString()}`)
      setBatches(Array.isArray(res?.data) ? res.data : [])
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
      toast.error(err.message || 'Gagal memuat angkatan')
    } finally {
      setLoadingBatches(false)
      setInitialLoading(false)
    }
  }, [page, debouncedSearch, branchFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const isFiltered = search.trim() !== '' || branchFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setBranchFilter('ALL')
    setPage(1)
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
      setSelectedIds((prev) => prev.filter((id) => id !== String(confirmDel.id)))
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus angkatan')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(batches.map((b) => String(b.id)))
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

  const isAllSelected = batches.length > 0 && batches.every((b) => selectedIds.includes(String(b.id)))
  const isSomeSelected = batches.some((b) => selectedIds.includes(String(b.id))) && !isAllSelected

  const doBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await apiFetch('/admin/batches/bulk-delete', { method: 'POST', body: { ids: selectedIds } })
      toast.success(`${selectedIds.length} angkatan berhasil dihapus`)
      setSelectedIds([])
      setShowBulkDel(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus angkatan')
    } finally {
      setBulkDeleting(false)
    }
  }

  const doImport = async (_entity: string, rows: any[]) => {
    await apiFetch('/admin/batches', { method: 'POST', body: rows })
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
            title="Daftar Angkatan"
            desc="Kelola data nomor dan nama angkatan alumni SMA Unggulan CT Foundation."
            count={meta.total}
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
                className="pl-9 pr-9"
              />
              {loadingBatches && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
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

          {/* BULK ACTION TOOLBAR */}
          <BulkActionToolbar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={() => setShowBulkDel(true)}
            entityLabel="angkatan"
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table className={loadingBatches ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                      onCheckedChange={(c) => toggleSelectAll(!!c)}
                      aria-label="Pilih semua baris di halaman ini"
                    />
                  </TableHead>
                  <TableHead>No.</TableHead>
                  <TableHead>Nama Angkatan</TableHead>
                  <TableHead>Cabang / Kampus</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <EmptyRow
                    span={5}
                    text={
                      isFiltered
                        ? 'Tidak ada angkatan yang cocok dengan kriteria pencarian/filter.'
                        : 'Belum ada data angkatan.'
                    }
                  />
                ) : (
                  batches.map((b) => {
                    const isSelected = selectedIds.includes(String(b.id))
                    return (
                      <TableRow key={b.id} data-state={isSelected ? 'selected' : undefined}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => toggleSelectRow(String(b.id), !!c)}
                            aria-label={`Pilih ${b.name}`}
                          />
                        </TableCell>
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
            disabled={loadingBatches}
          />
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

      {/* CONFIRM BULK DELETE */}
      <ConfirmBulkDeleteDialog
        open={showBulkDel}
        count={selectedIds.length}
        deleting={bulkDeleting}
        entityLabel="angkatan"
        onClose={() => setShowBulkDel(false)}
        onConfirm={doBulkDelete}
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

