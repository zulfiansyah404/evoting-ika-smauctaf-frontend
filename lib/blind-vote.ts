import { RSABSSA } from '@cloudflare/blindrsa-ts'

export interface CredentialKeyCertificate {
  election_id: string
  batch_id: string
  public_key_pem: string
  signature: string
}

export interface PendingBlindCredential {
  certificate: CredentialKeyCertificate
  candidateId: string
  preparedMessage: string
  blindedMessage: string
  inverse: string
}

const PENDING_KEY = 'evoting_pending_credentials'
const suite = RSABSSA.SHA384.PSS.Randomized()

function toBase64URL(data: Uint8Array): string {
  let binary = ''
  for (const value of data) binary += String.fromCharCode(value)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64URL(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function importCredentialPublicKey(certificate: CredentialKeyCertificate): Promise<CryptoKey> {
  const encoded = certificate.public_key_pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')
  const der = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  return crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-PSS', hash: 'SHA-384' },
    false,
    ['verify'],
  )
}

async function verifyCredentialCertificate(
  certificate: CredentialKeyCertificate,
  expectedElectionId: string,
  expectedBatchId: string,
): Promise<void> {
  if (certificate.election_id !== expectedElectionId || certificate.batch_id !== expectedBatchId) {
    throw new Error('Credential key tidak sesuai pemilihan atau angkatan akun ini')
  }
  const rootKeyEncoded = process.env.NEXT_PUBLIC_CREDENTIAL_DIRECTORY_PUBLIC_KEY
  if (!rootKeyEncoded) throw new Error('Root public key credential belum dikonfigurasi')

  const rootKey = await crypto.subtle.importKey(
    'raw',
    fromBase64URL(rootKeyEncoded),
    { name: 'Ed25519' } as AlgorithmIdentifier,
    false,
    ['verify'],
  )
  const encoder = new TextEncoder()
  const fields = [certificate.election_id, certificate.batch_id, certificate.public_key_pem]
  const payload: Uint8Array[] = [encoder.encode('ika-smauctaf-rsabssa-key-v1\0')]
  for (const field of fields) {
    const bytes = encoder.encode(field)
    const length = new Uint8Array(4)
    new DataView(length.buffer).setUint32(0, bytes.length, false)
    payload.push(length, bytes)
  }
  const message = new Uint8Array(payload.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of payload) {
    message.set(part, offset)
    offset += part.length
  }
  const valid = await crypto.subtle.verify(
    { name: 'Ed25519' } as AlgorithmIdentifier,
    rootKey,
    fromBase64URL(certificate.signature),
    message,
  )
  if (!valid) throw new Error('Credential key certificate tidak valid')
}

export async function createBlindVoteCredential(
  certificate: CredentialKeyCertificate,
  candidateId: string,
  expectedElectionId: string,
  expectedBatchId: string,
): Promise<PendingBlindCredential> {
  await verifyCredentialCertificate(certificate, expectedElectionId, expectedBatchId)
  const serial = crypto.getRandomValues(new Uint8Array(32))
  const message = new TextEncoder().encode(JSON.stringify({
    version: 1,
    election_id: certificate.election_id,
    serial: toBase64URL(serial),
  }))
  const preparedMessage = suite.prepare(message)
  const publicKey = await importCredentialPublicKey(certificate)
  const { blindedMsg, inv } = await suite.blind(publicKey, preparedMessage)

  return {
    certificate,
    candidateId,
    preparedMessage: toBase64URL(preparedMessage),
    blindedMessage: toBase64URL(blindedMsg),
    inverse: toBase64URL(inv),
  }
}

export async function finalizeBlindVoteCredential(
  pending: PendingBlindCredential,
  blindedSignature: string,
): Promise<string> {
  const publicKey = await importCredentialPublicKey(pending.certificate)
  const preparedMessage = fromBase64URL(pending.preparedMessage)
  const signature = await suite.finalize(
    publicKey,
    preparedMessage,
    fromBase64URL(blindedSignature),
    fromBase64URL(pending.inverse),
  )
  if (!(await suite.verify(publicKey, signature, preparedMessage))) {
    throw new Error('Credential signature tidak valid')
  }
  return toBase64URL(signature)
}

export function getPendingBlindCredential(electionId: string): PendingBlindCredential | null {
  if (typeof window === 'undefined') return null
  const stored = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}') as Record<string, PendingBlindCredential>
  return stored[electionId] || null
}

export function savePendingBlindCredential(electionId: string, pending: PendingBlindCredential): void {
  if (typeof window === 'undefined') return
  const stored = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}') as Record<string, PendingBlindCredential>
  stored[electionId] = pending
  localStorage.setItem(PENDING_KEY, JSON.stringify(stored))
}

export function clearPendingBlindCredential(electionId: string): void {
  if (typeof window === 'undefined') return
  const stored = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}') as Record<string, PendingBlindCredential>
  delete stored[electionId]
  localStorage.setItem(PENDING_KEY, JSON.stringify(stored))
}