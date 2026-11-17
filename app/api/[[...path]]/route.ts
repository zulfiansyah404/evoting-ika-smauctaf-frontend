import { NextResponse } from 'next/server'
import { posix as posixPath } from 'path'

const EXTERNAL = process.env.EVOTING_API_URL
const BALLOT_BOX = process.env.EVOTING_BALLOTBOX_URL

const ALLOWED_BE_PREFIXES = ['/login', '/candidates', '/elections', '/batches', '/ballots', '/admin']
const ALLOWED_BB_PREFIXES = ['/ballots', '/health', '/elections', '/results', '/verify']

function cors(res, request) {
  const configured = (process.env.CORS_ORIGINS || '').trim()
  const requestOrigin = request?.headers?.get('origin')?.trim() || ''

  if (configured === '*') {
    res.headers.set('Access-Control-Allow-Origin', '*')
  } else if (configured && requestOrigin) {
    const allowed = configured
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o && o !== '*')
    if (allowed.some((o) => o.toLowerCase() === requestOrigin.toLowerCase())) {
      res.headers.set('Access-Control-Allow-Origin', requestOrigin)
      res.headers.set('Access-Control-Allow-Credentials', 'true')
      res.headers.append('Vary', 'Origin')
    }
  }

  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

function buildSafeTargetUrl(baseUrlStr, segments, search, allowedPrefixes) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { error: 'Path proxy tidak boleh kosong', status: 400 }
  }

  const cleanSegments = []
  for (const rawSeg of segments) {
    let decoded
    try {
      decoded = decodeURIComponent(rawSeg)
    } catch {
      return { error: 'Encoding path tidak valid', status: 400 }
    }

    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('%') ||
      /[\x00-\x1f\x7f]/.test(decoded)
    ) {
      return { error: 'Segmen path tidak valid', status: 400 }
    }

    cleanSegments.push(encodeURIComponent(decoded))
  }

  const normalizedPath = posixPath.normalize('/' + cleanSegments.join('/'))
  if (normalizedPath.includes('..') || !normalizedPath.startsWith('/')) {
    return { error: 'Path tidak diizinkan', status: 400 }
  }

  const isAllowed = allowedPrefixes.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
  )
  if (!isAllowed) {
    return { error: 'Rute proxy tidak diizinkan', status: 403 }
  }

  const baseUrl = new URL(baseUrlStr)
  const basePathname = baseUrl.pathname.replace(/\/+$/, '')
  const targetUrl = new URL(baseUrl.origin + basePathname + normalizedPath + (search || ''))

  if (targetUrl.origin !== baseUrl.origin || !targetUrl.pathname.startsWith(basePathname + '/')) {
    return { error: 'Target URL tidak valid', status: 400 }
  }

  return { target: targetUrl.toString() }
}

async function proxyRequest(request, baseUrlStr, segments, allowedPrefixes, missingEnvMsg, forwardAuth) {
  if (!baseUrlStr) {
    return cors(
      NextResponse.json({ status: 'error', message: missingEnvMsg }, { status: 500 }),
      request
    )
  }

  const url = new URL(request.url)
  const result = buildSafeTargetUrl(baseUrlStr, segments, url.search, allowedPrefixes)
  if (result.error) {
    return cors(
      NextResponse.json({ status: 'error', message: result.error }, { status: result.status }),
      request
    )
  }

  const method = request.method
  const headers = {}
  if (forwardAuth) {
    const auth = request.headers.get('authorization')
    if (auth) headers['Authorization'] = auth
  }

  let body
  if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
    const txt = await request.text()
    if (txt) {
      body = txt
      headers['Content-Type'] = request.headers.get('content-type') || 'application/json'
    }
  }

  const resp = await fetch(result.target, { method, headers, body, cache: 'no-store' })
  const text = await resp.text()
  return cors(
    new NextResponse(text, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json' },
    }),
    request
  )
}

export async function OPTIONS(request) {
  return cors(new NextResponse(null, { status: 204 }), request)
}

async function handler(request, { params }) {
  const { path = [] } = await params

  try {
    if (path[0] === 'bb') {
      return await proxyRequest(
        request,
        BALLOT_BOX,
        path.slice(1),
        ALLOWED_BB_PREFIXES,
        'EVOTING_BALLOTBOX_URL belum dikonfigurasi',
        false
      )
    }

    // Proxy everything under /api/be/* to the external e-voting REST API
    if (path[0] === 'be') {
      return await proxyRequest(
        request,
        EXTERNAL,
        path.slice(1),
        ALLOWED_BE_PREFIXES,
        'EVOTING_API_URL belum dikonfigurasi',
        true
      )
    }

    if (path.length === 0 || path[0] === 'root') {
      return cors(NextResponse.json({ message: 'E-Voting IKA SMAU CT ARSA API proxy aktif' }), request)
    }

    return cors(
      NextResponse.json({ status: 'error', message: `Route /${path.join('/')} tidak ditemukan` }, { status: 404 }),
      request
    )
  } catch (e) {
    console.error('Proxy error:', e)
    return cors(
      NextResponse.json({ status: 'error', message: 'Gagal menghubungi server API: ' + e.message }, { status: 502 }),
      request
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
