'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus, Pencil, Trash2, Loader2, Upload, FileSpreadsheet, Download,
} from 'lucide-react'

export const CHART_COLORS = ['#c9a86a', '#161e2e', '#3a7a6d', '#c9744a', '#7a5aa0']

export const statusBadge: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  ended: 'bg-rose-100 text-rose-800 border-rose-200',
  complete: 'bg-blue-100 text-blue-800 border-blue-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
}

export function TableToolbar({
  title,
  desc,
  count,
  filter,
  onCreate,
  createLabel,
  onImport,
  importLabel,
}: {
  title: string
  desc: string
  count: number
  filter?: React.ReactNode
  onCreate?: () => void
  createLabel?: string
  onImport?: () => void
  importLabel?: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-lg text-navy">
            {title} <span className="text-muted-foreground text-sm font-sans">({count})</span>
          </h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onImport && (
            <Button variant="outline" className="border-navy/20 text-navy hover:bg-navy/5" onClick={onImport}>
              <Upload className="h-4 w-4 mr-2" /> {importLabel || 'Impor CSV'}
            </Button>
          )}
          {onCreate && (
            <Button className="bg-navy hover:bg-navy-light text-white" onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" /> {createLabel}
            </Button>
          )}
        </div>
      </div>
      {filter && <div>{filter}</div>}
    </div>
  )
}

export function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-navy" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function EmptyRow({ span, text }: { span: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={span} className="text-center text-muted-foreground py-10">
        {text}
      </TableCell>
    </TableRow>
  )
}

export function ConfirmDeleteDialog({
  target,
  deleting,
  onClose,
  onConfirm,
}: {
  target: { id: number | string; label?: string } | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !deleting && !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-navy">Konfirmasi Hapus</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus {target?.label ? <span className="font-semibold text-navy">"{target.label}"</span> : 'data ini'}? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={deleting}>Batal</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menghapus...</> : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BulkActionToolbar({
  selectedCount,
  onClear,
  onDelete,
  entityLabel = 'data',
}: {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  entityLabel?: string
}) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 p-3 my-3 bg-navy/5 border border-navy/20 rounded-lg animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full bg-navy text-white text-xs font-semibold">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-navy">
          {entityLabel} terpilih
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-navy"
          onClick={onClear}
        >
          Batal Pilih
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="text-xs flex items-center gap-1.5"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Hapus ({selectedCount}) Terpilih
        </Button>
      </div>
    </div>
  )
}

export function ConfirmBulkDeleteDialog({
  open,
  count,
  deleting,
  entityLabel = 'data',
  onClose,
  onConfirm,
}: {
  open: boolean
  count: number
  deleting: boolean
  entityLabel?: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !deleting && !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-navy">Konfirmasi Hapus Sekaligus</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus <strong className="text-navy">{count} {entityLabel}</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menghapus...
              </>
            ) : (
              `Hapus ${count} ${entityLabel}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- CSV Importer ----------------
export function parseCSV(text: string) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!clean) return { headers: [], rows: [] }
  const lines = clean.split('\n').filter((l) => l.trim() !== '')
  const splitLine = (line: string) => {
    const out: string[] = []
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
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

export const IMPORT_CONFIG: Record<string, any> = {
  user: {
    title: 'Impor Pengguna (CSV)',
    cols: ['name', 'email', 'password', 'name_batch', 'number'],
    template: 'name,email,password,name_batch,number\nBudi Santoso,budi@email.com,password123,Angsa,081200000010\nSiti Aminah,siti@email.com,password123,Angkasa,\nAgus Pratama,,password123,Gentacakra,081200000012',
    map: (r: any) => ({
      name: (r.name || '').trim(),
      email: (r.email || '').trim(),
      password: r.password,
      name_batch: (r.name_batch || '').trim() || null,
      number: String(r.number || '').trim(),
    }),
    valid: (o: any) => o.name && (o.email || o.number) && o.password && o.name_batch,
  },
  batch: {
    title: 'Impor Angkatan (CSV)',
    cols: ['name', 'branch', 'number'],
    template: 'name,branch,number\nNebula,Deli Serdang,15\nOrion,Deli Serdang,16',
    map: (r: any) => ({ name: r.name, branch: r.branch, number: Number(r.number) || 0 }),
    valid: (o: any) => o.name && o.branch,
  },
}

export function ImportDialog({
  entity,
  onClose,
  onImport,
}: {
  entity: 'user' | 'batch' | null
  onClose: () => void
  onImport: (entity: string, rows: any[]) => Promise<void>
}) {
  const cfg = entity ? IMPORT_CONFIG[entity] : null
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setRaw('') }, [entity])

  const parsed = cfg && raw ? parseCSV(raw) : { headers: [], rows: [] }
  const mapped = cfg ? parsed.rows.map(cfg.map) : []
  const validRows = cfg ? mapped.filter(cfg.valid) : []

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const txt = await f.text()
    setRaw(txt)
  }

  const submit = async () => {
    if (!entity) return
    if (validRows.length === 0) { toast.error('Tidak ada baris valid untuk diimpor'); return }
    setBusy(true)
    try {
      await onImport(entity, validRows)
      toast.success(`${validRows.length} data berhasil diimpor`)
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengimpor data')
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = () => {
    if (!cfg) return
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
              <DialogTitle className="font-serif text-xl text-navy flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-gold-dark" /> {cfg.title}
              </DialogTitle>
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
                      <TableHeader><TableRow>{cfg.cols.map((c: string) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {mapped.slice(0, 50).map((r: any, i: number) => (
                          <TableRow key={i} className={cfg.valid(r) ? '' : 'bg-destructive/5'}>
                            {cfg.cols.map((c: string) => <TableCell key={c} className="text-xs">{String(r[c] ?? '')}</TableCell>)}
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

