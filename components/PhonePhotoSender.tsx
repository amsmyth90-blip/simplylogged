"use client";
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { decryptPhonePacket, encodeBytes, encryptPhonePacket, PHONE_CHUNK_BYTES, PHONE_PHOTO_COUNT, PHONE_PHOTO_LIMIT, PHONE_SESSION_MS, phoneSessionCrypto } from '@/lib/phone-photo-transfer';

async function preparePhoto(file: File) {
  if (!file.type.startsWith('image/') || file.size > 30 * 1024 * 1024) throw new Error('Choose a photo smaller than 30 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot prepare the photo.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare the photo. Try JPEG or PNG.')), 'image/jpeg', 0.86));
    if (blob.size > PHONE_PHOTO_LIMIT) throw new Error('Photo is too large. Please take a smaller photo.');
    return new Uint8Array(await blob.arrayBuffer());
  } finally { URL.revokeObjectURL(url); }
}

export function PhonePhotoSender() {
  const [status, setStatus] = useState('Connecting to your computer…');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(0);
  const [fragment, setFragment] = useState<string | null>(null);
  const connection = useRef<{ channel: RealtimeChannel; key: CryptoKey; expires: number } | null>(null);
  const acknowledgements = useRef(new Map<string, () => void>());
  const locked = useRef(false);
  useEffect(() => {
    const readFragment = () => setFragment(window.location.hash);
    readFragment();
    window.addEventListener('hashchange', readFragment);
    return () => window.removeEventListener('hashchange', readFragment);
  }, []);
  useEffect(() => {
    if (fragment === null) return;
    setReady(false); setSent(0); setStatus('Connecting to your computer…');
    const pendingAcks = acknowledgements.current;
    let cancelled = false;
    let cleanup = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const [secret, expiry] = fragment.slice(1).split('.');
      const expires = Number(expiry);
      if (!Number.isSafeInteger(expires) || expires <= Date.now() || expires > Date.now() + PHONE_SESSION_MS) throw new Error('This link has expired or is incomplete. Scan a new QR code on your computer.');
      const { key, topic } = await phoneSessionCrypto(secret);
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Phone transfer is unavailable.');
      if (cancelled) return;
      const channel = client.channel(topic);
      cleanup = () => { connection.current = null; void client.removeChannel(channel); };
      timer = setTimeout(() => { cleanup(); setReady(false); setStatus('This connection has expired. Scan a new QR code.'); }, expires - Date.now());
      channel.on('broadcast', { event: 'ack' }, ({ payload }) => {
        void decryptPhonePacket(key, payload).then(value => {
          const ack = (value as { ack?: unknown })?.ack;
          if (typeof ack === 'string') acknowledgements.current.get(ack)?.();
        }).catch(() => {});
      }).subscribe(state => {
        if (cancelled) return;
        if (state === 'SUBSCRIBED') { connection.current = { channel, key, expires }; setReady(true); setStatus('Ready. Take a photo or choose photos to send to your computer.'); }
        else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') { connection.current = null; setReady(false); setStatus('Connection lost. Keep the computer window open and scan its QR code again.'); }
      });
    })().catch(error => { if (!cancelled) setStatus(error instanceof Error ? error.message : 'Could not connect.'); });
    return () => { cancelled = true; clearTimeout(timer); cleanup(); pendingAcks.clear(); };
  }, [fragment]);
  async function send(files: File[]) {
    if (locked.current || !connection.current || !files.length) return;
    const expectedConnection = connection.current;
    locked.current = true; setBusy(true);
    try {
      if (files.length + sent > PHONE_PHOTO_COUNT) throw new Error('Send up to 12 photos per connection.');
      for (const file of files) {
        const bytes = await preparePhoto(file);
        const id = crypto.randomUUID(), total = Math.ceil(bytes.length / PHONE_CHUNK_BYTES);
        for (let part = 0; part < total; part++) {
          const current: { channel: RealtimeChannel; key: CryptoKey; expires: number } | null = connection.current;
          if (!current || current !== expectedConnection || Date.now() >= current.expires) throw new Error('Connection ended. Scan a new QR code.');
          setStatus(`Sending photo — ${Math.round(part / total * 100)}%`);
          const ack = `${id}:${part}`;
          let delivered = false;
          for (let attempt = 0; attempt < 3 && !delivered; attempt++) {
            if (connection.current !== expectedConnection || Date.now() >= current.expires) throw new Error('Connection ended. Scan a new QR code.');
            const payload = await encryptPhonePacket(current.key, { id, part, total, data: encodeBytes(bytes.slice(part * PHONE_CHUNK_BYTES, (part + 1) * PHONE_CHUNK_BYTES)) });
            delivered = await new Promise<boolean>(resolve => {
              const timeout = setTimeout(() => { acknowledgements.current.delete(ack); resolve(false); }, 6000);
              acknowledgements.current.set(ack, () => { clearTimeout(timeout); acknowledgements.current.delete(ack); resolve(true); });
              void current.channel.send({ type: 'broadcast', event: 'photo', payload }).catch(() => { clearTimeout(timeout); acknowledgements.current.delete(ack); resolve(false); });
            });
          }
          if (!delivered) throw new Error('The computer did not receive the photo. Keep its QR window open and try again.');
        }
        setSent(value => value + 1);
      }
      setStatus('Photos received on your computer. Return there and choose “Use photo” to continue.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not send this photo. Try JPEG or PNG.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="mx-auto w-full max-w-lg rounded-3xl bg-white p-6 text-[#20352a] shadow-sm">
    <p className="text-sm font-semibold">DiaryDock</p><h1 className="mt-3 text-2xl font-semibold">Send photos to your computer</h1>
    <p className="mt-3 text-sm">Your photos go to the open upload window, where you can review them before saving. No sign-in is needed on this phone.</p>
    <div className="mt-6 grid gap-3">
      <label className="rounded-xl bg-[#20352a] p-4 text-center font-semibold text-white">Take photo<input aria-label="Take photo" type="file" accept="image/*" capture="environment" disabled={!ready || busy || sent >= PHONE_PHOTO_COUNT} className="sr-only" onChange={event => { void send(Array.from(event.target.files ?? [])); event.currentTarget.value = ''; }} /></label>
      <label className="rounded-xl border border-[#20352a]/20 p-4 text-center font-semibold">Choose photos<input aria-label="Choose photos" type="file" accept="image/*" multiple disabled={!ready || busy || sent >= PHONE_PHOTO_COUNT} className="sr-only" onChange={event => { void send(Array.from(event.target.files ?? [])); event.currentTarget.value = ''; }} /></label>
    </div>
    <p role="status" className="mt-5 text-sm">{status}</p><p className="mt-3 text-sm">{sent} of 12 photos sent</p>
    <p className="mt-5 text-xs text-slate-500">Encrypted transfer. This link cannot access your account or saved documents. Close the computer’s QR window to end the connection.</p>
  </section>;
}
