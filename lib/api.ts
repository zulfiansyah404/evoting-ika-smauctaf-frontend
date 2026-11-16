// API helpers for E-Voting IKA SMAU CT ARSA
// All calls go through the Next.js proxy at /api/be/* -> external REST API

const BE = '/api/be'
const TOKEN_KEY = 'evoting_token'
const RECEIPT_KEY = 'evoting_receipts'

export interface DecodedToken {
  user_id?: string | number
  role?: string
  name?: string
  batch_id?: string | number
  batch_name?: string
  batch_number?: number
  batch_branch?: string
  exp?: number
  [key: string]: any
}

export interface UserSession {
  token: string
  role?: string
  userId?: string | number
  name?: string
  batchId?: string | number
  batchName?: string
  batchNumber?: number
  batchBranch?: string
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  auth?: boolean
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(t: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, t)
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    )
    return json
  } catch (e) {
    return null
  }
}

export function getSession(): UserSession | null {
  const t = getToken()
  if (!t) return null
  const d = decodeToken(t)
  if (!d) return null
  if (d.exp && d.exp * 1000 < Date.now()) {
    clearToken()
    return null
  }
  return {
    token: t,
    role: d.role,
    userId: d.user_id,
    name: d.name,
    batchId: d.batch_id,
    batchName: d.batch_name,
    batchNumber: d.batch_number,
    batchBranch: d.batch_branch,
  }
}

export async function apiFetch<T = any>(
  path: string,
  { method = 'GET', body, auth = true }: ApiFetchOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = getToken()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }
  const res = await fetch(`${BE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: any = null
  try {
    data = await res.json()
  } catch (e) {}
  if (!res.ok || (data && data.status === 'error')) {
    const msg = (data && data.message) || `Terjadi kesalahan (${res.status})`
    const err: any = new Error(msg)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data as T
}

export async function ballotFetch<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`/api/bb${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  let data: any = null
  try {
    data = await res.json()
  } catch (e) {}
  if (!res.ok || (data && data.status === 'error')) {
    const msg = (data && data.message) || `Terjadi kesalahan (${res.status})`
    const err: any = new Error(msg)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data as T
}

// Receipt local storage (per election) so voter can see their receipt again
export function saveReceipt(electionId: string | number, receipt: any): void {
  if (typeof window === 'undefined') return
  const all = JSON.parse(localStorage.getItem(RECEIPT_KEY) || '{}')
  all[electionId] = receipt
  localStorage.setItem(RECEIPT_KEY, JSON.stringify(all))
}

export function getReceipts(): Record<string, any> {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem(RECEIPT_KEY) || '{}')
}

export function fmtDate(s?: string | null | Date): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return String(s)
  }
}

export function toInputDate(s?: string | null | Date): string {
  if (!s) return ''
  try {
    const d = new Date(s)
    const off = d.getTimezoneOffset()
    const local = new Date(d.getTime() - off * 60000)
    return local.toISOString().slice(0, 16)
  } catch (e) {
    return ''
  }
}

export function electionStatus(e: any): 'active' | 'upcoming' | 'ended' | 'complete' | 'inactive' | 'unknown' {
  if (!e) return 'unknown'
  if (e.status === 'inactive') return 'inactive'
  if (e.status === 'complete') return 'complete'

  const now = Date.now()
  const s = new Date(e.start_time).getTime()
  const en = new Date(e.end_time).getTime()
  if (isNaN(s) || isNaN(en)) return 'unknown'
  if (now < s) return 'upcoming'
  if (now > en) return 'ended'
  return 'active'
}

export const STATUS_LABEL: Record<string, string> = {
  active: 'Sedang Berlangsung',
  upcoming: 'Akan Datang',
  ended: 'Waktu Berakhir',
  complete: 'Telah Selesai',
  inactive: 'Draf (Belum Publik)',
  unknown: 'Tidak Diketahui',
}
