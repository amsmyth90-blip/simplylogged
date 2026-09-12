import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhoneSession, phoneSessionCrypto, encryptPhonePacket, decryptPhonePacket, PhonePhotoReceiver, encodeBytes, PHONE_CHUNK_BYTES } from '../lib/phone-photo-transfer.ts';

test('photo packets require the matching QR key and resist tampering', async () => {
  const a = await phoneSessionCrypto(createPhoneSession().secret);
  const b = await phoneSessionCrypto(createPhoneSession().secret);
  const packet = { photo: 'private test photo' };
  const encrypted = await encryptPhonePacket(a.key, packet);
  assert.equal(JSON.stringify(encrypted).includes(packet.photo), false);
  assert.deepEqual(await decryptPhonePacket(a.key, encrypted), packet);
  await assert.rejects(decryptPhonePacket(b.key, encrypted));
  await assert.rejects(decryptPhonePacket(a.key, { ...encrypted, data: 'AAAA' }));
  assert.notEqual(a.topic, b.topic);
});
test('receiver reconstructs ordered chunks and does not duplicate retried photos', () => {
  const r = new PhonePhotoReceiver(Date.now() + 10000);
  const id = crypto.randomUUID();
  const first = { id, part: 0, total: 2, data: encodeBytes(new Uint8Array([255,216,255,1])) };
  assert.equal(r.accept(first).photo, undefined);
  assert.equal(r.accept(first).photo, undefined);
  const last = { id, part: 1, total: 2, data: encodeBytes(new Uint8Array([2,3])) };
  assert.deepEqual(r.accept(last).photo, new Uint8Array([255,216,255,1,2,3]));
  assert.equal(r.accept(last).photo, undefined);
});
test('receiver rejects expired, out of order, oversized and non-photo messages', () => {
  const packet = { id: crypto.randomUUID(), part: 0, total: 1, data: encodeBytes(new Uint8Array([255,216,255])) };
  assert.throws(() => new PhonePhotoReceiver(Date.now()-1).accept(packet), /expired/);
  const r = new PhonePhotoReceiver(Date.now()+10000);
  assert.throws(() => r.accept({ ...packet, part: 1, total: 2 }));
  assert.throws(() => r.accept({ ...packet, total: 100000 }));
  assert.throws(() => r.accept({ ...packet, data: encodeBytes(new Uint8Array(PHONE_CHUNK_BYTES+1)) }));
  assert.throws(() => r.accept({ ...packet, id: crypto.randomUUID(), data: encodeBytes(new Uint8Array([1,2,3])) }));
});
test('receiver limits a connection to twelve photos', () => {
  const r = new PhonePhotoReceiver(Date.now()+10000);
  const packet = () => ({ id: crypto.randomUUID(), part: 0, total: 1, data: encodeBytes(new Uint8Array([255,216,255])) });
  for (let i=0;i<12;i++) assert.ok(r.accept(packet()).photo);
  assert.throws(() => r.accept(packet()), /Too many/);
});
