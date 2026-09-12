// The QR fragment is the encryption key. Only encrypted packets reach Realtime.
export const PHONE_PHOTO_LIMIT = 4 * 1024 * 1024;
export const PHONE_PHOTO_COUNT = 12;
export const PHONE_SESSION_MS = 10 * 60 * 1000;
export const PHONE_CHUNK_BYTES = 24 * 1024;

export function encodeBytes(bytes: Uint8Array) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export function decodeBytes(value: string) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}
export function createPhoneSession() {
  return { secret: encodeBytes(crypto.getRandomValues(new Uint8Array(32))), expires: Date.now() + PHONE_SESSION_MS };
}
export async function phoneSessionCrypto(secret: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) throw new Error('Invalid phone link. Scan a new QR code.');
  const bytes = decodeBytes(secret);
  const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return { key, topic: `phone-photo-${encodeBytes(new Uint8Array(hash))}` };
}
export async function encryptPhonePacket(key: CryptoKey, packet: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(packet)));
  return { iv: encodeBytes(iv), data: encodeBytes(new Uint8Array(encrypted)) };
}
export async function decryptPhonePacket(key: CryptoKey, payload: unknown): Promise<unknown> {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid packet');
  const { iv, data } = payload as Record<string, unknown>;
  if (typeof iv !== 'string' || iv.length !== 16 || typeof data !== 'string' || data.length > 60000) throw new Error('Invalid packet');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBytes(iv) }, key, decodeBytes(data));
  return JSON.parse(new TextDecoder().decode(plain));
}

type PhotoPacket = { id: string; part: number; total: number; data: string };
export class PhonePhotoReceiver {
  private pending = new Map<string, { chunks: Uint8Array[]; total: number; size: number }>();
  private complete = new Set<string>();
  private count = 0;
  private expires: number;
  constructor(expires: number) { this.expires = expires; }
  accept(value: unknown): { ack: string; photo?: Uint8Array } {
    if (Date.now() > this.expires) throw new Error('This QR code has expired.');
    if (!value || typeof value !== 'object') throw new Error('Invalid photo');
    const p = value as PhotoPacket;
    if (!/^[a-f0-9-]{36}$/.test(p.id) || !Number.isInteger(p.part) || !Number.isInteger(p.total) || p.total < 1 || p.total > Math.ceil(PHONE_PHOTO_LIMIT / PHONE_CHUNK_BYTES) || p.part < 0 || p.part >= p.total || typeof p.data !== 'string' || p.data.length > PHONE_CHUNK_BYTES * 1.4) throw new Error('Invalid photo');
    const ack = `${p.id}:${p.part}`;
    if (this.complete.has(p.id)) return { ack };
    let pending = this.pending.get(p.id);
    if (!pending) {
      if (p.part !== 0 || this.count + this.pending.size >= PHONE_PHOTO_COUNT) throw new Error('Too many photos. Start a new transfer.');
      pending = { chunks: [], total: p.total, size: 0 };
      this.pending.set(p.id, pending);
    }
    if (p.total !== pending.total || p.part > pending.chunks.length) throw new Error('Photo arrived out of order.');
    if (p.part < pending.chunks.length) return { ack };
    const chunk = decodeBytes(p.data);
    if (chunk.length > PHONE_CHUNK_BYTES || pending.size + chunk.length > PHONE_PHOTO_LIMIT) throw new Error('Photo is too large.');
    pending.chunks.push(chunk); pending.size += chunk.length;
    if (pending.chunks.length !== pending.total) return { ack };
    const photo = new Uint8Array(pending.size);
    let offset = 0;
    for (const part of pending.chunks) { photo.set(part, offset); offset += part.length; }
    if (photo[0] !== 255 || photo[1] !== 216 || photo[2] !== 255) { this.pending.delete(p.id); throw new Error('Please send a JPEG photo.'); }
    this.pending.delete(p.id); this.complete.add(p.id); this.count++;
    return { ack, photo };
  }
}
