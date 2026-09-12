"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { createPhoneSession, decryptPhonePacket, encryptPhonePacket, PhonePhotoReceiver, phoneSessionCrypto } from '@/lib/phone-photo-transfer';

export function PhonePhotoUpload({ onFiles, multiple = false, disabled = false }: { onFiles: (files: File[]) => void; multiple?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState('');
  const [phoneUrl, setPhoneUrl] = useState('');
  const [status, setStatus] = useState('Connecting…');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = open ? files.map(file => URL.createObjectURL(file)) : [];
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files, open]);
  const opener = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = opener.current;
    closeButton.current?.focus();
    let cancelled = false;
    let cleanup = () => {};
    const session = createPhoneSession();
    const timer = setTimeout(() => { cleanup(); setQr(''); setStatus('This QR code has expired. Close and reopen to connect again.'); }, session.expires - Date.now());
    setQr(''); setPhoneUrl(''); setFiles([]); setStatus('Connecting…');
    void (async () => {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Phone upload is unavailable. Please choose files on this computer.');
      const { key, topic } = await phoneSessionCrypto(session.secret);
      if (cancelled) return;
      const receiver = new PhonePhotoReceiver(session.expires);
      const channel = client.channel(topic);
      cleanup = () => { void client.removeChannel(channel); };
      let queue = Promise.resolve();
      channel.on('broadcast', { event: 'photo' }, ({ payload }) => {
        queue = queue.then(async () => {
          if (cancelled || Date.now() > session.expires) return;
          const result = receiver.accept(await decryptPhonePacket(key, payload));
          if (result.photo) {
            const file = new File([new Uint8Array(result.photo)], `phone-photo-${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' });
            setFiles(current => [...current, file]);
            setStatus('Photo received. Take another or use the photos below.');
          }
          await channel.send({ type: 'broadcast', event: 'ack', payload: await encryptPhonePacket(key, { ack: result.ack }) });
        }).catch(() => { if (!cancelled) setStatus('A photo could not be received. Please retry it on your phone.'); });
      }).subscribe(async state => {
        if (cancelled) return;
        if (state === 'SUBSCRIBED') {
          try {
            const url = new URL('/phone-upload', window.location.origin);
            url.hash = `${session.secret}.${session.expires}`;
            const code = await QRCode.toDataURL(url.href, { width: 256, margin: 3, color: { dark: '#20352a', light: '#ffffff' } });
            if (!cancelled) { setPhoneUrl(url.href); setQr(code); setStatus('Scan with your phone camera. Keep this window open.'); }
          } catch { setStatus('Could not create the QR code. Please try again.'); }
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') { setQr(''); setStatus('Could not connect. Close and try again, or choose files on this computer.'); }
      });
    })().catch(error => { if (!cancelled) setStatus(error instanceof Error ? error.message : 'Could not connect.'); });
    return () => { cancelled = true; clearTimeout(timer); cleanup(); trigger?.focus(); };
  }, [open]);
  return <>
    <button ref={opener} type="button" disabled={disabled} onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(true); }} className="hidden min-h-10 items-center justify-center rounded-xl border border-[#20352a]/20 bg-white px-3 py-2 text-sm font-semibold text-[#20352a] disabled:opacity-50 sm:inline-flex">Use my phone</button>
    {open && createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-5" onClick={event => { event.preventDefault(); event.stopPropagation(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="phone-upload-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-[#20352a] shadow-xl" onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); }
        if (event.key === 'Tab') {
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
        <div className="flex items-center justify-between gap-3"><h2 id="phone-upload-title" className="text-xl font-semibold">Take photos with your phone</h2><button ref={closeButton} type="button" aria-label="Close phone upload" className="min-h-10 min-w-10" onClick={() => setOpen(false)}>✕</button></div>
        <p className="mt-3 text-sm">Scan the QR code, take your photos, then return here to review and upload them. The connection expires after 10 minutes.</p>
        {/* QR is generated locally, contains no account credentials and is never sent to an image service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="Scan this QR code with your phone camera to send photos to this computer" width={256} height={256} className="mx-auto my-3" />}
        {qr && <a href={phoneUrl} target="_blank" rel="noreferrer" className="block text-center text-sm underline" onClick={event => event.stopPropagation()}>Open phone upload page</a>}
        <p role="status" className="my-3 text-sm">{status}</p>
        {previews.length > 0 && <div className="flex gap-2 overflow-x-auto py-2">{previews.map((url, index) =>
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt={`Received photo ${index + 1}`} width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg border object-contain" />
        )}</div>}
        <p className="text-xs text-slate-500">Photos are encrypted during transfer. This code cannot open your account or saved files. Only share it with your own phone.</p>
        {files.length > 0 && <div className="mt-4">
          <p className="mb-3 text-sm">{files.length} photo{files.length === 1 ? '' : 's'} received{!multiple && files.length > 1 ? ' — the latest photo will be used' : ''}.</p>
          <button type="button" className="min-h-11 w-full rounded-xl bg-[#20352a] p-3 font-semibold text-white" onClick={() => { onFiles(multiple ? files : files.slice(-1)); setOpen(false); }}>Use {multiple && files.length > 1 ? 'photos' : 'photo'}</button>
          </div>}
      </section>
    </div>, document.body)}
  </>;
}
