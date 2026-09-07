import { NextResponse } from 'next/server'

const EXTERNAL = process.env.EVOTING_API_URL

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function handler(request, { params }) {
  const { path = [] } = await params
  const method = request.method

  try {
    // Proxy everything under /api/be/* to the external e-voting REST API
    if (path[0] === 'be') {
      if (!EXTERNAL) {
        return cors(
          NextResponse.json(
            { status: 'error', message: 'EVOTING_API_URL belum dikonfigurasi' },
            { status: 500 }
          )
        )
      }
      const targetPath = '/' + path.slice(1).join('/')
      const url = new URL(request.url)
      const target = EXTERNAL + targetPath + (url.search || '')

      const headers = {}
      const auth = request.headers.get('authorization')
      if (auth) headers['Authorization'] = auth

      let body
      if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
        const txt = await request.text()
        if (txt) {
          body = txt
          headers['Content-Type'] = request.headers.get('content-type') || 'application/json'
        }
      }

      const resp = await fetch(target, { method, headers, body, cache: 'no-store' })
      const text = await resp.text()
      return cors(
        new NextResponse(text, {
          status: resp.status,
          headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json' },
        })
      )
    }

    if (path.length === 0 || path[0] === 'root') {
      return cors(NextResponse.json({ message: 'E-Voting IKA SMAU CT ARSA API proxy aktif' }))
    }

    return cors(NextResponse.json({ status: 'error', message: `Route /${path.join('/')} tidak ditemukan` }, { status: 404 }))
  } catch (e) {
    console.error('Proxy error:', e)
    return cors(
      NextResponse.json({ status: 'error', message: 'Gagal menghubungi server API: ' + e.message }, { status: 502 })
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
