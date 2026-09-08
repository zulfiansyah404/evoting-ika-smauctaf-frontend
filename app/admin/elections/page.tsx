'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  apiFetch, fmtDate, toInputDate, electionStatus, STATUS_LABEL,
} from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { CheckCircle2, Loader2, Search, X } from 'lucide-react'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog, statusBadge,
} from '@/components/admin/admin-shared'

export default function AdminElectionsPage() {
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState<any[]>([])

  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; values: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ id: number | string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState<any | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/admin/elections').catch(() => apiFetch('/elections').catch(() => ({ data: [] })))
      setElections(Array.isArray(res?.data) ? res.data : [])
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat daftar pemilihan')
    } finally {
      setLoading(false)
    }
  }

  // Filtered elections
  const filteredElections = useMemo(() => {
    return elections.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = (e.name || '').toLowerCase().includes(q)
        const descMatch = (e.description || '').toLowerCase().includes(q)
        if (!nameMatch && !descMatch) return false
      }

      if (statusFilter !== 'ALL') {
        const st = electionStatus(e)
        if (st !== statusFilter && e.status !== statusFilter) return false
      }

      return true
    })
  }, [elections, search, statusFilter])

  const isFiltered = search.trim() !== '' || statusFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
  }

  const openCreate = () => {
    setModal({
      mode: 'create',
      values: { name: '', description: '', start_time: '', end_time: '', status: 'inactive' },
    })
  }

  const openEdit = (row: any) => {
    setModal({
      mode: 'edit',
      values: {
        id: row.id,
        name: row.name || '',
        description: row.description || '',
        start_time: toInputDate(row.start_time),
        end_time: toInputDate(row.end_time),
        status: row.status || 'inactive',
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
        description: values.description || '',
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        status: values.status || 'inactive',
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
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pemilihan')
    } finally {
      setDeleting(false)
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
            title="Daftar Pemilihan"
            desc="Kelola agenda pemungutan suara, status pemilihan, dan periode voting."
            count={elections.length}
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
                className="pl-9"
              />
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

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Selesai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredElections.length === 0 ? (
                  <EmptyRow
                    span={5}
                    text={
                      isFiltered
                        ? 'Tidak ada pemilihan yang cocok dengan kriteria filter.'
                        : 'Belum ada data pemilihan.'
                    }
                  />
                ) : (
                  filteredElections.map((e) => {
                    const st = electionStatus(e)
                    const isActive = e.status === 'active'
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium text-navy">{e.name}</TableCell>
                        <TableCell className="text-sm">{fmtDate(e.start_time)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(e.end_time)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge[st]}>
                            {STATUS_LABEL[st]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                                onClick={() => setConfirmComplete(e)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-amber-600" /> Akhiri Pemilihan
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

          {isFiltered && (
            <div className="text-xs text-muted-foreground mt-3">
              Menampilkan {filteredElections.length} dari {elections.length} pemilihan terdaftar.
            </div>
          )}
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
                <Field label="Nama Pemilihan">
                  <Input
                    value={modal.values.name}
                    onChange={(e) => setVal('name', e.target.value)}
                    required
                    placeholder="Pemilihan Ketua Umum IKA SMAUCTAF"
                  />
                </Field>
                <Field label="Deskripsi">
                  <Textarea
                    value={modal.values.description}
                    onChange={(e) => setVal('description', e.target.value)}
                    rows={3}
                    placeholder="Deskripsi singkat agenda pemilihan"
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

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDeleteDialog
        target={confirmDel}
        deleting={deleting}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
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

