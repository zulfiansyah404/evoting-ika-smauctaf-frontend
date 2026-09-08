'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Loader2, Search, X } from 'lucide-react'
import {
  TableToolbar, RowActions, EmptyRow, Field, ConfirmDeleteDialog,
} from '@/components/admin/admin-shared'

export default function AdminCandidatesPage() {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [elections, setElections] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])

  // Filter states
  const [search, setSearch] = useState('')
  const [electionFilter, setElectionFilter] = useState('ALL')
  const [batchFilter, setBatchFilter] = useState('ALL')

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; values: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ id: number | string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cRes, uRes, eRes, bRes] = await Promise.all([
        apiFetch('/candidates').catch(() => ({ data: [] })),
        apiFetch('/admin/users').catch(() => ({ data: [] })),
        apiFetch('/admin/elections').catch(() => apiFetch('/elections').catch(() => ({ data: [] }))),
        apiFetch('/admin/batches').catch(() => ({ data: [] })),
      ])
      setCandidates(Array.isArray(cRes?.data) ? cRes.data : [])
      setUsers(Array.isArray(uRes?.data) ? uRes.data : [])
      setElections(Array.isArray(eRes?.data) ? eRes.data : [])
      setBatches(Array.isArray(bRes?.data) ? bRes.data : [])
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat kandidat')
    } finally {
      setLoading(false)
    }
  }

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = (c.user_name || '').toLowerCase().includes(q)
        const initialsMatch = (c.initials || '').toLowerCase().includes(q)
        const visionMatch = (c.vision || '').toLowerCase().includes(q)
        if (!nameMatch && !initialsMatch && !visionMatch) return false
      }

      if (electionFilter !== 'ALL') {
        const matchesElection =
          String(c.id_election) === String(electionFilter) ||
          (c.election_name || '').trim() === (electionFilter || '').trim()
        if (!matchesElection) return false
      }

      if (batchFilter !== 'ALL') {
        const matchesBatch =
          (c.batch_name || '').trim() === (batchFilter || '').trim() ||
          String(c.batch_number) === String(batchFilter)
        if (!matchesBatch) return false
      }

      return true
    })
  }, [candidates, search, electionFilter, batchFilter])

  const isFiltered = search.trim() !== '' || electionFilter !== 'ALL' || batchFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setElectionFilter('ALL')
    setBatchFilter('ALL')
  }

  const openCreate = () => {
    setModal({
      mode: 'create',
      values: { id_user: '', id_election: '', initials: '', vision: '', mission: '' },
    })
  }

  const openEdit = (row: any) => {
    setModal({
      mode: 'edit',
      values: {
        id: row.id,
        id_user: row.id_user ? String(row.id_user) : '',
        id_election: row.id_election ? String(row.id_election) : '',
        initials: row.initials || '',
        vision: row.vision || '',
        mission: row.mission || '',
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
        id_user: Number(values.id_user),
        id_election: Number(values.id_election),
        initials: values.initials,
        vision: values.vision,
        mission: values.mission,
      }

      if (mode === 'create') {
        await apiFetch('/admin/candidates', { method: 'POST', body: payload })
        toast.success('Kandidat berhasil ditambahkan')
      } else {
        await apiFetch(`/admin/candidates/${values.id}`, { method: 'PUT', body: payload })
        toast.success('Kandidat berhasil diperbarui')
      }
      setModal(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kandidat')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/candidates/${confirmDel.id}`, { method: 'DELETE' })
      toast.success('Kandidat berhasil dihapus')
      setConfirmDel(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus kandidat')
    } finally {
      setDeleting(false)
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
            title="Daftar Kandidat"
            desc="Kelola profil calon kandidat beserta visi & misi pemilihan."
            count={candidates.length}
            onCreate={openCreate}
            createLabel="Tambah Kandidat"
          />

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center gap-3 my-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, inisial, atau visi kandidat..."
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
                  <SelectItem value="ALL">Semua Pemilihan</SelectItem>
                  {elections.map((el) => (
                    <SelectItem key={el.id} value={String(el.name)}>
                      {el.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Angkatan Filter */}
            <div className="w-48">
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Angkatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Angkatan</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={String(b.name)}>
                      {b.name} (No. {b.number})
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
                  <TableHead>Inisial</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Angkatan</TableHead>
                  <TableHead>Pemilihan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <EmptyRow
                    span={5}
                    text={
                      isFiltered
                        ? 'Tidak ada kandidat yang cocok dengan kriteria filter.'
                        : 'Belum ada data kandidat.'
                    }
                  />
                ) : (
                  filteredCandidates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-gold text-xs font-semibold">
                          {(c.initials || '?').toString().slice(0, 2)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-navy">{c.user_name || '-'}</TableCell>
                      <TableCell className="text-sm">{c.batch_name || '-'}</TableCell>
                      <TableCell className="text-sm">{c.election_name || '-'}</TableCell>
                      <TableCell>
                        <RowActions
                          onEdit={() => openEdit(c)}
                          onDelete={() => setConfirmDel({ id: c.id, label: c.user_name || c.initials })}
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
              Menampilkan {filteredCandidates.length} dari {candidates.length} kandidat terdaftar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL TAMBAH / UBAH */}
      <Dialog open={!!modal} onOpenChange={(o) => !saving && !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {modal && (
            <form onSubmit={submitModal}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-navy">
                  {modal.mode === 'create' ? 'Tambah Kandidat' : 'Ubah Kandidat'}
                </DialogTitle>
                <DialogDescription>Hubungkan akun pengguna dengan agenda pemilihan.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <Field label="Pengguna (Akun Calon)">
                  <Select value={String(modal.values.id_user)} onValueChange={(v) => setVal('id_user', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih pengguna" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name || u.email} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Pemilihan">
                  <Select value={String(modal.values.id_election)} onValueChange={(v) => setVal('id_election', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih agenda pemilihan" /></SelectTrigger>
                    <SelectContent>
                      {elections.map((el) => (
                        <SelectItem key={el.id} value={String(el.id)}>
                          {el.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Inisial / Nomor Urut">
                  <Input
                    value={modal.values.initials}
                    onChange={(e) => setVal('initials', e.target.value)}
                    required
                    placeholder="01 / A"
                  />
                </Field>

                <Field label="Visi">
                  <Textarea
                    value={modal.values.vision}
                    onChange={(e) => setVal('vision', e.target.value)}
                    rows={3}
                    required
                    placeholder="Visi calon kandidat"
                  />
                </Field>

                <Field label="Misi">
                  <Textarea
                    value={modal.values.mission}
                    onChange={(e) => setVal('mission', e.target.value)}
                    rows={4}
                    required
                    placeholder="Misi dan program kerja utama"
                  />
                </Field>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Batal</Button>
                <Button className="bg-navy hover:bg-navy-light text-white" type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Kandidat'}
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
    </div>
  )
}

