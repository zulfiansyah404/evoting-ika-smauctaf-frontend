'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
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
import { Loader2, Search, X, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  RowActions, EmptyRow, Field, ConfirmDeleteDialog,
  BulkActionToolbar, ConfirmBulkDeleteDialog,
} from '@/components/admin/admin-shared'
import { TablePagination } from '@/components/admin/table-pagination'

export default function AdminCandidatesPage() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidates, setCandidates] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [elections, setElections] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])

  // Filter states
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [electionFilter, setElectionFilter] = useState('ALL')
  const [questionFilter, setQuestionFilter] = useState('ALL')

  // Pagination states
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 })

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; values: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ id: number | string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [presetLoading, setPresetLoading] = useState(false)

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkDel, setShowBulkDel] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Load auxiliary data (users, elections with questions, batches) once
  const loadAuxData = useCallback(async () => {
    try {
      const [uRes, eRes, bRes] = await Promise.all([
        apiFetch('/admin/users?all=true').catch(() => ({ data: [] })),
        apiFetch('/admin/elections?all=true').catch(() => apiFetch('/elections').catch(() => ({ data: [] }))),
        apiFetch('/admin/batches').catch(() => ({ data: [] })),
      ])
      setUsers(Array.isArray(uRes?.data) ? uRes.data : [])
      setElections(Array.isArray(eRes?.data) ? eRes.data : [])
      setBatches(Array.isArray(bRes?.data) ? bRes.data : [])
    } catch (err: any) {
      console.error('Failed to load auxiliary data:', err)
    }
  }, [])

  useEffect(() => {
    loadAuxData()
  }, [loadAuxData])

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, electionFilter, questionFilter])

  // Reset questionFilter if electionFilter changes
  useEffect(() => {
    setQuestionFilter('ALL')
  }, [electionFilter])

  // Questions available for the currently selected election filter
  const filterElectionQuestions = useMemo(() => {
    if (electionFilter === 'ALL') return []
    const el = elections.find((e) => String(e.id) === String(electionFilter))
    return el?.questions || []
  }, [elections, electionFilter])

  // Fetch candidates from server with pagination & filters
  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '10')
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (electionFilter !== 'ALL') params.set('election_id', electionFilter)
      if (questionFilter !== 'ALL') params.set('question_id', questionFilter)

      const cRes = await apiFetch(`/candidates?${params.toString()}`).catch(() => ({ data: [] }))
      setCandidates(Array.isArray(cRes?.data) ? cRes.data : [])

      if (cRes?.meta) {
        setMeta(cRes.meta)
      } else {
        setMeta({
          page: 1,
          limit: 10,
          total: Array.isArray(cRes?.data) ? cRes.data.length : 0,
          total_pages: 1,
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data pilihan suara')
    } finally {
      setLoadingCandidates(false)
      setInitialLoading(false)
    }
  }, [page, debouncedSearch, electionFilter, questionFilter])

  useEffect(() => {
    loadCandidates()
  }, [loadCandidates])

  const isFiltered = search.trim() !== '' || electionFilter !== 'ALL' || questionFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setElectionFilter('ALL')
    setQuestionFilter('ALL')
    setPage(1)
  }

  // Questions available in the modal form based on chosen election
  const modalQuestions = useMemo(() => {
    if (!modal?.values.id_election) return []
    const el = elections.find((e) => String(e.id) === String(modal.values.id_election))
    return el?.questions || []
  }, [elections, modal?.values.id_election])

  const openCreate = () => {
    const defaultElectionId = electionFilter !== 'ALL' ? electionFilter : (elections[0]?.id ? String(elections[0].id) : '')
    const selectedEl = elections.find((e) => String(e.id) === defaultElectionId)
    const defaultQuestionId = questionFilter !== 'ALL' ? questionFilter : (selectedEl?.questions?.[0]?.id ? String(selectedEl.questions[0].id) : '')

    setModal({
      mode: 'create',
      values: {
        id_election: defaultElectionId,
        id_question: defaultQuestionId,
        label: '',
        description: '',
        image_url: '',
        order_number: (meta.total || candidates.length) + 1,
        id_user: '',
      },
    })
  }

  const openEdit = (row: any) => {
    setModal({
      mode: 'edit',
      values: {
        id: row.id,
        id_election: row.id_election ? String(row.id_election) : '',
        id_question: row.id_question ? String(row.id_question) : '',
        label: row.label || row.name || '',
        description: row.description || row.vision || '',
        image_url: row.image_url || '',
        order_number: row.order_number || 1,
        id_user: row.id_user ? String(row.id_user) : '',
      },
    })
  }

  const setVal = (k: string, val: any) => {
    setModal((m) => {
      if (!m) return null
      const updated = { ...m.values, [k]: val }
      // If election changed, automatically set first question of that election
      if (k === 'id_election') {
        const el = elections.find((e) => String(e.id) === String(val))
        updated.id_question = el?.questions?.[0]?.id ? String(el.questions[0].id) : ''
      }
      return { ...m, values: updated }
    })
  }

  const submitModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modal) return
    const { mode, values } = modal

    if (!values.id_election) {
      toast.error('Pilih sesi pemilihan')
      return
    }

    if (!values.label.trim()) {
      toast.error('Label / Nama pilihan wajib diisi')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        id_election: values.id_election,
        id_question: values.id_question ? String(values.id_question) : null,
        label: values.label.trim(),
        name: values.label.trim(),
        description: values.description || '',
        image_url: values.image_url || '',
        order_number: Number(values.order_number) || 1,
        id_user: values.id_user ? String(values.id_user) : null,
      }

      if (mode === 'create') {
        await apiFetch('/admin/candidates', { method: 'POST', body: payload })
        toast.success('Pilihan suara berhasil ditambahkan')
      } else {
        await apiFetch(`/admin/candidates/${values.id}`, { method: 'PUT', body: payload })
        toast.success('Pilihan suara berhasil diperbarui')
      }
      setModal(null)
      await loadCandidates()
      // Refresh elections in background in case candidate counts updated
      loadAuxData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pilihan')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/candidates/${confirmDel.id}`, { method: 'DELETE' })
      toast.success('Pilihan berhasil dihapus')
      setSelectedIds((prev) => prev.filter((id) => id !== String(confirmDel.id)))
      setConfirmDel(null)
      await loadCandidates()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pilihan')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(candidates.map((c) => String(c.id)))
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

  const isAllSelected = candidates.length > 0 && candidates.every((c) => selectedIds.includes(String(c.id)))
  const isSomeSelected = candidates.some((c) => selectedIds.includes(String(c.id))) && !isAllSelected

  const doBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await apiFetch('/admin/candidates/bulk-delete', { method: 'POST', body: { ids: selectedIds } })
      toast.success(`${selectedIds.length} pilihan suara berhasil dihapus`)
      setSelectedIds([])
      setShowBulkDel(false)
      await loadCandidates()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pilihan suara')
    } finally {
      setBulkDeleting(false)
    }
  }

  // 1-Click Quick Preset: Setuju, Tidak Setuju, Abstain
  const applyReferendumPreset = async () => {
    const targetElectionId = electionFilter !== 'ALL'
      ? (elections.find((e) => String(e.id) === String(electionFilter) || e.name === electionFilter)?.id)
      : elections[0]?.id

    if (!targetElectionId) {
      toast.error('Silakan pilih salah satu sesi pemilihan pada filter di atas terlebih dahulu.')
      return
    }

    const targetElection = elections.find((e) => String(e.id) === String(targetElectionId))
    const targetElectionName = targetElection?.name || 'pemilihan ini'

    // Determine target question
    let targetQuestionId = questionFilter !== 'ALL' ? questionFilter : ''
    if (!targetQuestionId && targetElection?.questions?.length > 0) {
      targetQuestionId = targetElection.questions[0].id
    }

    const confirmed = window.confirm(`Tambahkan 3 opsi standar (Setuju, Tidak Setuju, Abstain) ke "${targetElectionName}"?`)
    if (!confirmed) return

    setPresetLoading(true)
    try {
      const presets = [
        { label: 'Setuju', description: 'Menyetujui usulan keputusan yang diajukan.', order_number: 1 },
        { label: 'Tidak Setuju', description: 'Menolak usulan keputusan yang diajukan.', order_number: 2 },
        { label: 'Abstain', description: 'Memilih untuk tidak menentukan sikap (netral).', order_number: 3 },
      ]

      for (const p of presets) {
        await apiFetch('/admin/candidates', {
          method: 'POST',
          body: {
            id_election: targetElectionId,
            id_question: targetQuestionId || null,
            label: p.label,
            name: p.label,
            description: p.description,
            order_number: p.order_number,
          },
        })
      }

      toast.success('3 Opsi Referendum berhasil ditambahkan')
      await loadCandidates()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerapkan preset')
    } finally {
      setPresetLoading(false)
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-serif text-2xl text-navy">Pilihan Ganda & Opsi Suara</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Kelola daftar pilihan ganda, opsi keputusan, atau profil kandidat untuk setiap pertanyaan dalam agenda voting.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={applyReferendumPreset}
                disabled={presetLoading || elections.length === 0}
                className="border-gold text-gold-dark hover:bg-gold/10"
              >
                {presetLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2 text-gold-dark" />
                )}
                Preset: Setuju / Tolak / Abstain
              </Button>
              <Button className="bg-navy hover:bg-navy-light text-white" size="sm" onClick={openCreate}>
                + Tambah Pilihan
              </Button>
            </div>
          </div>

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center gap-3 my-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari label opsi, nama, atau deskripsi..."
                className="pl-9"
              />
            </div>

            {/* Pemilihan Filter */}
            <div className="w-56">
              <Select value={electionFilter} onValueChange={setElectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Pemilihan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Sesi Pemilihan</SelectItem>
                  {elections.map((el) => (
                    <SelectItem key={el.id} value={String(el.id)}>
                      {el.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pertanyaan Filter (Active only if specific election selected) */}
            {electionFilter !== 'ALL' && filterElectionQuestions.length > 0 && (
              <div className="w-56">
                <Select value={questionFilter} onValueChange={setQuestionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Pertanyaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Pertanyaan</SelectItem>
                    {filterElectionQuestions.map((q: any) => (
                      <SelectItem key={q.id} value={String(q.id)}>
                        {q.order_number ? `${q.order_number}. ` : ''}{q.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
            entityLabel="pilihan suara"
          />

          <div className="rounded-lg border border-border overflow-x-auto relative">
            {loadingCandidates && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-navy" />
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                      onCheckedChange={(c) => toggleSelectAll(!!c)}
                      aria-label="Pilih semua baris"
                    />
                  </TableHead>
                  <TableHead className="w-16 text-center">No</TableHead>
                  <TableHead>Pilihan / Opsi</TableHead>
                  <TableHead>Sesi Pemilihan</TableHead>
                  <TableHead>Pertanyaan Terkait</TableHead>
                  <TableHead>Akun Alumni Terhubung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.length === 0 ? (
                  <EmptyRow
                    span={7}
                    text={
                      isFiltered
                        ? 'Tidak ada pilihan yang cocok dengan kriteria filter.'
                        : 'Belum ada opsi pilihan ganda terdaftar.'
                    }
                  />
                ) : (
                  candidates.map((c, idx) => {
                    const isSelected = selectedIds.includes(String(c.id))
                    return (
                      <TableRow key={c.id} data-state={isSelected ? 'selected' : undefined}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => toggleSelectRow(String(c.id), !!c)}
                            aria-label={`Pilih ${c.label || c.name}`}
                          />
                        </TableCell>
                        <TableCell className="text-center font-bold text-navy">
                          {c.order_number || idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt={c.label || c.name}
                                className="h-10 w-10 object-cover rounded-md border border-border shrink-0"
                                onError={(ev: any) => { ev.target.style.display = 'none' }}
                              />
                            ) : (
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10 text-navy font-semibold text-xs shrink-0">
                                {c.order_number || idx + 1}
                              </span>
                            )}
                            <div>
                              <div className="font-semibold text-navy">{c.label || c.name || 'Pilihan'}</div>
                              {c.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-md mt-0.5">{c.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{c.election_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-xs bg-slate-50 border-slate-200 text-slate-700">
                            {c.question_title || 'Pertanyaan Utama'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.user_name ? (
                            <span className="font-medium text-navy">{c.user_name}</span>
                          ) : (
                            <span className="italic text-xs text-muted-foreground/80">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RowActions
                            onEdit={() => openEdit(c)}
                            onDelete={() => setConfirmDel({ id: c.id, label: c.label || c.name || 'Pilihan ini' })}
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
            disabled={loadingCandidates}
          />
        </CardContent>
      </Card>

      {/* MODAL TAMBAH / UBAH OPSI */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create' ? 'Tambah Pilihan Suara' : 'Ubah Pilihan Suara'}
                </DialogTitle>
                <DialogDescription>
                  Masukkan opsi jawaban pilihan ganda untuk pertanyaan dan sesi voting yang dipilih.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Field label="Sesi Pemilihan (Wajib)">
                  <Select value={String(modal.values.id_election)} onValueChange={(v) => setVal('id_election', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih sesi pemilihan" /></SelectTrigger>
                    <SelectContent>
                      {elections.map((el) => (
                        <SelectItem key={el.id} value={String(el.id)}>
                          {el.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Pertanyaan Terkait */}
                {modalQuestions.length > 0 && (
                  <Field label="Pertanyaan Terkait (Wajib)">
                    <Select
                      value={String(modal.values.id_question || modalQuestions[0]?.id || '')}
                      onValueChange={(v) => setVal('id_question', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih pertanyaan" /></SelectTrigger>
                      <SelectContent>
                        {modalQuestions.map((q: any) => (
                          <SelectItem key={q.id} value={String(q.id)}>
                            {q.order_number ? `${q.order_number}. ` : ''}{q.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <Field label="Label / Teks Pilihan (Wajib)">
                      <Input
                        value={modal.values.label}
                        onChange={(e) => setVal('label', e.target.value)}
                        required
                        placeholder="Contoh: Setuju / Opsi A: Medan / Budi Santoso"
                      />
                    </Field>
                  </div>
                  <div>
                    <Field label="No. Urut">
                      <Input
                        type="number"
                        min="1"
                        value={modal.values.order_number}
                        onChange={(e) => setVal('order_number', e.target.value)}
                      />
                    </Field>
                  </div>
                </div>

                <Field label="Deskripsi / Penjelasan Opsi (Opsional)">
                  <Textarea
                    value={modal.values.description}
                    onChange={(e) => setVal('description', e.target.value)}
                    rows={3}
                    placeholder="Penjelasan detail pilihan, visi-misi kandidat, atau poin pertimbangan opsi ini"
                  />
                </Field>

                <Field label="URL Gambar / Foto Opsi (Opsional)">
                  <Input
                    type="url"
                    value={modal.values.image_url}
                    onChange={(e) => setVal('image_url', e.target.value)}
                    placeholder="https://contoh.com/foto-opsi.jpg"
                  />
                  {modal.values.image_url && (
                    <div className="mt-2 rounded-lg border border-border p-2 bg-secondary/30 flex items-center gap-3">
                      <img
                        src={modal.values.image_url}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded border border-border"
                        onError={(ev: any) => { ev.target.style.display = 'none' }}
                      />
                      <span className="text-xs text-muted-foreground">Pratinjau gambar opsi</span>
                    </div>
                  )}
                </Field>

                <div className="pt-2 border-t border-border">
                  <Field label="Hubungkan ke Akun Alumni (Opsional - khusus pemilihan figur/ketua)">
                    <Select
                      value={modal.values.id_user || 'NONE'}
                      onValueChange={(v) => {
                        const val = v === 'NONE' ? '' : v
                        setVal('id_user', val)
                        if (val && !modal.values.label) {
                          const u = users.find((usr) => String(usr.id) === val)
                          if (u) setVal('label', u.name)
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih akun alumni jika relevan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">- Tanpa Akun Pengguna (Opsi Terbuka/Keputusan) -</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name || u.email} {u.batch?.name ? `(${u.batch.name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
                <Button className="bg-navy hover:bg-navy-light text-white" type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Pilihan'}
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
        entityLabel="pilihan suara"
        onClose={() => setShowBulkDel(false)}
        onConfirm={doBulkDelete}
      />
    </div>
  )
}
