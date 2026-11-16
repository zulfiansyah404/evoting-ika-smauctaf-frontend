'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, HelpCircle, GripVertical } from 'lucide-react'

interface QuestionDialogProps {
  election: any | null
  open: boolean
  onClose: () => void
  onChanged: () => void
}

export function QuestionDialog({
  election,
  open,
  onClose,
  onChanged,
}: QuestionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [editingQ, setEditingQ] = useState<any | null>(null)
  const [form, setForm] = useState({ title: '', description: '', is_required: true, order_number: 1 })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (open && election?.id) {
      loadQuestions()
      resetForm()
    }
  }, [open, election])

  const loadQuestions = async () => {
    if (!election?.id) return
    setLoading(true)
    try {
      const res = await apiFetch(`/elections/${election.id}/questions`)
      setQuestions(Array.isArray(res?.data) ? res.data : [])
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat pertanyaan')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingQ(null)
    setForm({
      title: '',
      description: '',
      is_required: true,
      order_number: (questions.length || 0) + 1,
    })
  }

  const startEdit = (q: any) => {
    setEditingQ(q)
    setForm({
      title: q.title || '',
      description: q.description || '',
      is_required: q.is_required ?? true,
      order_number: q.order_number ?? 1,
    })
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Judul pertanyaan wajib diisi')
      return
    }

    setSaving(true)
    try {
      if (editingQ) {
        await apiFetch(`/admin/question/${editingQ.id}`, {
          method: 'PUT',
          body: {
            id_election: election.id,
            title: form.title.trim(),
            description: form.description.trim(),
            is_required: form.is_required,
            order_number: Number(form.order_number),
          },
        })
        toast.success('Pertanyaan berhasil diperbarui')
      } else {
        await apiFetch('/admin/question', {
          method: 'POST',
          body: {
            id_election: election.id,
            title: form.title.trim(),
            description: form.description.trim(),
            is_required: form.is_required,
            order_number: Number(form.order_number) || questions.length + 1,
          },
        })
        toast.success('Pertanyaan berhasil ditambahkan')
      }
      resetForm()
      await loadQuestions()
      onChanged()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pertanyaan')
    } finally {
      setSaving(false)
    }
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pertanyaan ini beserta seluruh opsi di dalamnya?')) {
      return
    }
    setDeletingId(id)
    try {
      await apiFetch(`/admin/question/${id}`, { method: 'DELETE' })
      toast.success('Pertanyaan berhasil dihapus')
      if (editingQ?.id === id) resetForm()
      await loadQuestions()
      onChanged()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pertanyaan')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-navy flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold-dark" />
            Kelola Pertanyaan: {election?.name}
          </DialogTitle>
          <DialogDescription>
            Atur daftar pertanyaan voting yang akan dijawab oleh pemilih pada agenda pemilihan ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* FORM TAMBAH / EDIT PERTANYAAN */}
          <form onSubmit={submitForm} className="border border-border rounded-lg p-4 bg-secondary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-navy">
                {editingQ ? 'Edit Pertanyaan' : 'Tambah Pertanyaan Baru'}
              </span>
              {editingQ && (
                <Button variant="ghost" size="sm" type="button" onClick={resetForm} className="h-7 text-xs">
                  Batal Edit
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Judul Pertanyaan *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Pemilihan Ketua Umum IKA SMA UCTAF 2026-2029"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Petunjuk / Deskripsi Tambahan (Opsional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Petunjuk khusus bagi pemilih untuk pertanyaan ini..."
                rows={2}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_req"
                    checked={form.is_required}
                    onCheckedChange={(c) => setForm({ ...form, is_required: !!c })}
                  />
                  <label htmlFor="is_req" className="text-xs cursor-pointer select-none">
                    Wajib dijawab pemilih
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs">Nomor Urut:</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.order_number}
                    onChange={(e) => setForm({ ...form, order_number: Number(e.target.value) })}
                    className="w-16 h-8 text-xs"
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="bg-navy hover:bg-navy-light text-white" disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Menyimpan...</>
                ) : editingQ ? (
                  'Simpan Perubahan'
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" /> Tambah Pertanyaan</>
                )}
              </Button>
            </div>
          </form>

          {/* DAFTAR PERTANYAAN */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daftar Pertanyaan Terdaftar ({questions.length})
            </h4>

            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-navy" />
                Memuat daftar pertanyaan...
              </div>
            ) : questions.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Belum ada pertanyaan pada pemilihan ini. Tambahkan pertanyaan pertama melalui formulir di atas.
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="border border-border rounded-lg p-3 bg-card hover:bg-secondary/10 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-navy/10 text-navy text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {q.order_number || idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-navy">{q.title}</span>
                          <Badge
                            variant="outline"
                            className={
                              q.is_required
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                : 'bg-slate-50 text-slate-600 border-slate-200 text-[10px]'
                            }
                          >
                            {q.is_required ? 'Wajib' : 'Opsional'}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            • {q.candidates?.length || 0} opsi/kandidat
                          </span>
                        </div>
                        {q.description && (
                          <p className="text-xs text-muted-foreground">{q.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-navy"
                        onClick={() => startEdit(q)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === q.id}
                        onClick={() => deleteQuestion(q.id)}
                      >
                        {deletingId === q.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
