import { useEffect, useState } from "react";
import QRCode from "qrcode";

import type { NewPhysicalLink } from "@diarydock/physical-links";
import {
  copyPhysicalLink,
  physicalLinkUrl,
  savePhysicalQr,
  sharePhysicalLink,
  writePhysicalNfc,
} from "./physical-link-output";

export function PhysicalLinkOutput(props: { link: NewPhysicalLink; onDone: () => void;
  onMessage: (message: string) => void }) {
  const [qr, setQr] = useState("");
  const url = physicalLinkUrl(props.link.path);
  useEffect(() => { let active = true;
    void QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: "M",
      color: { dark: "#20352a", light: "#fffdf8" } })
      .then((value) => { if (active) setQr(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [url]);

  async function action(work: () => Promise<void>, success: string) {
    try { await work(); props.onMessage(success); }
    catch (error) { props.onMessage(error instanceof Error ? error.message : "That action did not finish."); }
  }

  return <section className="physical-new-link"><div className="physical-qr">
    {/* QR data URLs are generated locally inside the packaged Capacitor application. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {qr ? <img src={qr} alt="New DiaryDock Physical Link QR code" /> : <span>Preparing QR…</span>}
  </div><div><small>Save this now</small><h2>Your new private tag</h2>
    <p>DiaryDock stores only a one-way verifier. This exact QR and NFC payload cannot be shown again.</p>
    <div className="physical-output-actions"><button type="button"
      onClick={() => void action(() => copyPhysicalLink(url), "Private link copied.")}>Copy link</button>
      <button type="button" onClick={() => void action(() => sharePhysicalLink(url),
        "Private link shared.")}>Share</button>
      <button type="button" disabled={!qr} onClick={() => void action(() => savePhysicalQr(qr),
        "QR code handed to your device securely.")}>Save QR</button>
      <button type="button" onClick={() => void action(() => writePhysicalNfc(url),
        "The NFC tag was written successfully.")}>Write NFC</button>
      <button type="button" onClick={props.onDone}>Done</button></div>
  </div></section>;
}
