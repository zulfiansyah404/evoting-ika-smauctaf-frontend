// API helpers for E-Voting IKA SMAU CT ARSA
// All calls go through the Next.js proxy at /api/be/* -> external REST API

const BE = '/api/be'
const TOKEN_KEY = 'evoting_token'
const RECEIPT_KEY = 'evoting_receipts'

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
}

export function decodeToken(token) {
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

export function getSession() {
  const t = getToken()
  if (!t) return null
  const d = decodeToken(t)
  if (!d) return null
  if (d.exp && d.exp * 1000 < Date.now()) {
    clearToken()
    return null
  }
  return { token: t, role: d.role, userId: d.user_id }
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
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
  let data = null
  try {
    data = await res.json()
  } catch (e) {}
  if (!res.ok || (data && data.status === 'error')) {
    const msg = (data && data.message) || `Terjadi kesalahan (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

// Receipt local storage (per election) so voter can see their receipt again
export function saveReceipt(electionId, receipt) {
  if (typeof window === 'undefined') return
  const all = JSON.parse(localStorage.getItem(RECEIPT_KEY) || '{}')
  all[electionId] = receipt
  localStorage.setItem(RECEIPT_KEY, JSON.stringify(all))
}
export function getReceipts() {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem(RECEIPT_KEY) || '{}')
}

export function fmtDate(s) {
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
    return s
  }
}

export function toInputDate(s) {
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

export function electionStatus(e) {
  if (!e) return 'unknown'
  const now = Date.now()
  const s = new Date(e.start_time).getTime()
  const en = new Date(e.end_time).getTime()
  if (isNaN(s) || isNaN(en)) return 'unknown'
  if (now < s) return 'upcoming'
  if (now > en) return 'ended'
  return 'active'
}

export const STATUS_LABEL = {
  active: 'Sedang Berlangsung',
  upcoming: 'Akan Datang',
  ended: 'Telah Selesai',
  unknown: 'Tidak Diketahui',
}
