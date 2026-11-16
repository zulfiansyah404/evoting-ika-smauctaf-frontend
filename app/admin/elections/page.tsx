'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  apiFetch, fmtDate, toInputDate, electionStatus, STATUS_LABEL,
} from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { CheckCircle2, Loader2, Search, X, HelpCircle, MessageSquare } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog, statusBadge,
  BulkActionToolbar, ConfirmBulkDeleteDialog,
} from '@/components/admin/admin-shared'
import { TablePagination } from '@/components/admin/table-pagination'
import { QuestionDialog } from '@/components/admin/question-dialog'

export default function AdminElectionsPage() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingElections, setLoadingElections] = useState(false)
  const [elections, setElections] = useState<any[]>([])

  // Filter states
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Pagination state
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 })

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; values: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ id: number | string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState<any | null>(null)
  const [completing, setCompleting] = useState(false)

  // Question Dialog State
  const [questionElection, setQuestionElection] = useState<any | null>(null)

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkDel, setShowBulkDel] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const loadData = useCallback(async () => {
    setLoadingElections(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const res = await apiFetch(`/admin/elections?${params.toString()}`).catch(() => ({ data: [] }))
      setElections(Array.isArray(res?.data) ? res.data : [])
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
      toast.error(err.message || 'Gagal memuat daftar pemilihan')
    } finally {
      setLoadingElections(false)
      setInitialLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const isFiltered = search.trim() !== '' || statusFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setPage(1)
  }

  const openCreate = () => {
    setModal({
      mode: 'create',
      values: {
        name: '',
        question: '',
        description: '',
        image_url: '',
        start_time: '',
        end_time: '',
        status: 'inactive',
        enable_feedback: false,
        feedback_prompt: '',
      },
    })
  }

  const openEdit = (row: any) => {
    setModal({
      mode: 'edit',
      values: {
        id: row.id,
        name: row.name || '',
        question: row.question || '',
        description: row.description || '',
        image_url: row.image_url || '',
        start_time: toInputDate(row.start_time),
        end_time: toInputDate(row.end_time),
        status: row.status || 'inactive',
        enable_feedback: !!row.enable_feedback,
        feedback_prompt: row.feedback_prompt || '',
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

    const startMs = new Date(values.start_time).getTime()
    const endMs = new Date(values.end_time).getTime()
    const now = Date.now()

    if (isNaN(startMs) || isNaN(endMs)) {
      toast.error('Waktu mulai dan waktu selesai wajib diisi dengan benar')
      return
    }

    if (endMs <= startMs) {
      toast.error('Waktu selesai pemilihan harus setelah waktu mulai')
      return
    }

    if (mode === 'create') {
      if (endMs < now) {
        toast.error('Waktu selesai pemilihan tidak boleh di masa lalu')
        return
      }
      if (startMs < now - 5 * 60 * 1000) {
        toast.error('Waktu mulai pemilihan tidak boleh di masa lalu')
        return
      }
    } else if (values.status === 'inactive') {
      if (endMs < now) {
        toast.error('Waktu selesai pemilihan tidak boleh di masa lalu')
        return
      }
      if (startMs < now - 5 * 60 * 1000) {
        toast.error('Waktu mulai pemilihan tidak boleh di masa lalu')
        return
      }
    } else if (values.status === 'active' && endMs < now) {
      toast.error('Waktu selesai pemilihan yang aktif tidak boleh di masa lalu')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: values.name,
        question: values.question || values.name,
        description: values.description || '',
        image_url: values.image_url || '',
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        status: values.status || 'inactive',
        enable_feedback: !!values.enable_feedback,
        feedback_prompt: values.feedback_prompt || '',
      }

      if (mode === 'create') {
        await apiFetch('/admin/elections', { method: 'POST', body: payload })
        toast.success('Pemilihan berhasil ditambahkan')
      } else {
        await apiFetch(`/admin/elections/${values.id}`, { method: 'PUT', body: payload })
        toast.success('Pemilihan berhasil diperbarui')
      }
      setModal(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pemilihan')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/elections/${confirmDel.id}`, { method: 'DELETE' })
      toast.success('Pemilihan berhasil dihapus')
      setSelectedIds((prev) => prev.filter((id) => id !== String(confirmDel.id)))
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pemilihan')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(elections.map((e) => String(e.id)))
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

  const isAllSelected = elections.length > 0 && elections.every((e) => selectedIds.includes(String(e.id)))
  const isSomeSelected = elections.some((e) => selectedIds.includes(String(e.id))) && !isAllSelected

  const doBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await apiFetch('/admin/elections/bulk-delete', { method: 'POST', body: { ids: selectedIds } })
      toast.success(`${selectedIds.length} pemilihan berhasil dihapus`)
      setSelectedIds([])
      setShowBulkDel(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pemilihan')
    } finally {
      setBulkDeleting(false)
    }
  }

  const doComplete = async () => {
    if (!confirmComplete) return
    setCompleting(true)
    try {
      await apiFetch(`/admin/elections/${confirmComplete.id}/complete`, { method: 'PUT' })
      toast.success(`Pemilihan "${confirmComplete.name}" berhasil diakhiri (status complete)`)
      setConfirmComplete(null)
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengakhiri pemilihan')
    } finally {
      setCompleting(false)
    }
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
            title="Daftar Pemilihan"
            desc="Kelola agenda pemungutan suara, pertanyaan voting, kritik & saran, dan status pemilihan."
            count={meta.total}
            onCreate={openCreate}
            createLabel="Tambah Pemilihan"
          />

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center gap-3 my-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau deskripsi pemilihan..."
                className="pl-9 pr-9"
              />
              {loadingElections && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            <div className="w-52">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="active">Active (Berjalan)</SelectItem>
                  <SelectItem value="upcoming">Upcoming (Akan Datang)</SelectItem>
                  <SelectItem value="complete">Complete (Selesai Final)</SelectItem>
                  <SelectItem value="inactive">Inactive (Draf)</SelectItem>
                  <SelectItem value="ended">Ended (Waktu Habis)</SelectItem>
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
            entityLabel="pemilihan"
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table className={loadingElections ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
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
                  <TableHead>Mulai</TableHead>
                  <TableHead>Selesai</TableHead>
                  <TableHead>Status & Fitur</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elections.length === 0 ? (
                  <EmptyRow
                    span={6}
                    text={
                      isFiltered
                        ? 'Tidak ada pemilihan yang cocok dengan kriteria pencarian/filter.'
                        : 'Belum ada data pemilihan.'
                    }
                  />
                ) : (
                  elections.map((e) => {
                    const st = electionStatus(e)
                    const isActive = e.status === 'active'
                    const isSelected = selectedIds.includes(String(e.id))
                    const qCount = e.questions?.length || 1
                    return (
                      <TableRow key={e.id} data-state={isSelected ? 'selected' : undefined}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => toggleSelectRow(String(e.id), !!c)}
                            aria-label={`Pilih ${e.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            {e.image_url ? (
                              <img
                                src={e.image_url}
                                alt={e.name}
                                className="h-10 w-10 object-cover rounded-md border border-border shrink-0 mt-0.5"
                                onError={(ev: any) => { ev.target.style.display = 'none' }}
                              />
                            ) : null}
                            <div>
                              <div className="font-semibold text-navy flex items-center gap-2">
                                {e.name}
                                {e.enable_feedback && (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                                    <MessageSquare className="h-3 w-3 mr-1" /> Feedback Aktif
                                  </Badge>
                                )}
                              </div>
                              {e.question && e.question !== e.name && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{e.question}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{fmtDate(e.start_time)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(e.end_time)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className={statusBadge[st]}>
                              {STATUS_LABEL[st]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-navy border-navy/20 hover:bg-navy/5"
                              onClick={() => setQuestionElection(e)}
                            >
                              <HelpCircle className="h-3.5 w-3.5 mr-1 text-gold-dark" />
                              Pertanyaan ({qCount})
                            </Button>

                            {isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                                onClick={() => setConfirmComplete(e)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-amber-600" /> Akhiri
                              </Button>
                            )}
                            <RowActions onEdit={() => openEdit(e)} onDelete={() => setConfirmDel({ id: e.id, label: e.name })} />
                          </div>
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
            disabled={loadingElections}
          />
        </CardContent>
      </Card>

      {/* FORM MODAL TAMBAH / UBAH */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create' ? 'Tambah Pemilihan' : 'Ubah Pemilihan'}
                </DialogTitle>
                <DialogDescription>Lengkapi informasi agenda pemilihan di bawah ini.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Field label="Judul / Nama Sesi Pemilihan">
                  <Input
                    value={modal.values.name}
                    onChange={(e) => setVal('name', e.target.value)}
                    required
                    placeholder="Contoh: Pemilihan Lokasi Reuni Akbar 2026 / Pemilihan Ketua IKA"
                  />
                </Field>
                <Field label="Pertanyaan Voting Utama (Wajib)">
                  <Textarea
                    value={modal.values.question}
                    onChange={(e) => setVal('question', e.target.value)}
                    rows={2}
                    required
                    placeholder="Contoh: Di manakah lokasi Reuni Akbar 1 Dekade IKA yang Anda rekomendasikan?"
                  />
                </Field>
                <Field label="URL Gambar / Banner Pertanyaan (Opsional)">
                  <Input
                    type="url"
                    value={modal.values.image_url}
                    onChange={(e) => setVal('image_url', e.target.value)}
                    placeholder="https://contoh.com/banner-reuni.jpg"
                  />
                  {modal.values.image_url && (
                    <div className="mt-2 rounded-lg border border-border p-2 bg-secondary/30">
                      <p className="text-xs text-muted-foreground mb-1">Pratinjau Gambar:</p>
                      <img
                        src={modal.values.image_url}
                        alt="Preview"
                        className="h-28 w-auto max-w-full object-contain rounded border border-border"
                        onError={(ev: any) => { ev.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                </Field>
                <Field label="Deskripsi / Keterangan Tambahan">
                  <Textarea
                    value={modal.values.description}
                    onChange={(e) => setVal('description', e.target.value)}
                    rows={2}
                    placeholder="Keterangan singkat, tata cara, atau latar belakang pertimbangan usulan"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Waktu Mulai">
                    <Input
                      type="datetime-local"
                      value={modal.values.start_time}
                      onChange={(e) => setVal('start_time', e.target.value)}
                      required={modal.mode === 'create'}
                    />
                  </Field>
                  <Field label="Waktu Selesai">
                    <Input
                      type="datetime-local"
                      value={modal.values.end_time}
                      onChange={(e) => setVal('end_time', e.target.value)}
                      required
                    />
                  </Field>
                </div>

                <Field label="Status Pemilihan">
                  <Select
                    value={modal.values.status || 'inactive'}
                    onValueChange={(v) => {
                      if (modal.values.status === 'inactive' && v === 'complete') {
                        toast.error('Pemilihan berstatus inactive tidak dapat langsung diselesaikan. Aktifkan (active) terlebih dahulu.')
                        return
                      }
                      setVal('status', v)
                    }}
                    disabled={modal.values.status === 'complete' && modal.mode === 'edit'}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inactive">Inactive (Draf / Belum Publik)</SelectItem>
                      <SelectItem value="active">Active (Publik / Berjalan)</SelectItem>
                      <SelectItem value="complete" disabled={modal.values.status === 'inactive'}>
                        Complete (Selesai & Final)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {modal.values.status === 'inactive' && 'Draf pemilihan, belum ditampilkan ke pemilih.'}
                    {modal.values.status === 'active' && 'Ditampilkan ke pemilih. Voting aktif sesuai rentang waktu mulai & selesai.'}
                    {modal.values.status === 'complete' && 'Pemilihan resmi ditutup dan hasil suara final dihitung.'}
                  </p>
                </Field>

                {/* TOGGLE KRITIK & SARAN (ANONIM) */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                    <div className="space-y-0.5 pr-2">
                      <Label htmlFor="fb-toggle" className="text-sm font-semibold text-purple-950 flex items-center gap-1.5 cursor-pointer">
                        <MessageSquare className="h-4 w-4 text-purple-700" />
                        Buka Kolom Kritik & Saran (100% Anonim)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Jika diaktifkan, pemilih akan diberikan formulir saran dan kritik setelah menjawab seluruh pertanyaan.
                      </p>
                    </div>
                    <Checkbox
                      id="fb-toggle"
                      checked={!!modal.values.enable_feedback}
                      onCheckedChange={(c) => setVal('enable_feedback', !!c)}
                    />
                  </div>

                  {modal.values.enable_feedback && (
                    <Field label="Petunjuk / Teks Pengantar Kritik & Saran">
                      <Input
                        value={modal.values.feedback_prompt || ''}
                        onChange={(e) => setVal('feedback_prompt', e.target.value)}
                        placeholder="Contoh: Silakan berikan masukan Anda untuk kemajuan IKA..."
                      />
                    </Field>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
                <Button className="bg-navy hover:bg-navy-light text-white" type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Pemilihan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QUESTION BUILDER DIALOG */}
      <QuestionDialog
        election={questionElection}
        open={!!questionElection}
        onClose={() => setQuestionElection(null)}
        onChanged={loadData}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDeleteDialog
        target={confirmDel}
        deleting={deleting}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {/* CONFIRM BULK DELETE DIALOG */}
      <ConfirmBulkDeleteDialog
        open={showBulkDel}
        count={selectedIds.length}
        deleting={bulkDeleting}
        entityLabel="pemilihan"
        onClose={() => setShowBulkDel(false)}
        onConfirm={doBulkDelete}
      />

      {/* DIALOG AKHIRI PEMILIHAN */}
      <Dialog open={!!confirmComplete} onOpenChange={(o) => !completing && !o && setConfirmComplete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-navy">Akhiri Pemilihan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengakhiri pemilihan <span className="font-semibold text-navy">"{confirmComplete?.name}"</span>?
              <br /><br />
              Status pemilihan akan diubah menjadi <span className="font-semibold text-blue-700">Complete</span>, penerimaan suara akan ditutup permanen, dan hasil perhitungan suara akan difinalisasi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmComplete(null)} disabled={completing}>Batal</Button>
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={doComplete} disabled={completing}>
              {completing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</> : 'Ya, Akhiri Pemilihan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
