"use client";

import { useState } from "react";
import type { VaultCredential } from "@diarydock/password-vault";

async function copySecret(value: string, label: string, setNotice: (value: string) => void) {
  await navigator.clipboard.writeText(value);
  setNotice(`${label} copied`);
  window.setTimeout(async () => {
    try {
      if ((await navigator.clipboard.readText()) === value) await navigator.clipboard.writeText("");
    } catch {
      /* Browsers may deny clipboard reads; the copy still succeeded. */
    }
    setNotice("");
  }, 30_000);
}

function safeWebsite(value: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function PasswordVaultList(props: {
  credentials: VaultCredential[];
  busy: boolean;
  onEdit: (entry: VaultCredential) => void;
  onDelete: (entry: VaultCredential) => Promise<void>;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set()),
    [notice, setNotice] = useState("");
  if (!props.credentials.length)
    return (
      <div className="rounded-[28px] border border-dashed border-[#315443]/25 bg-white/55 p-10 text-center">
        <h2 className="font-serif text-2xl text-[#20352a]">Your vault is ready</h2>
        <p className="mt-2 text-sm text-[#637068]">
          Add your first login. Every field is encrypted before it leaves this device.
        </p>
      </div>
    );
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {props.credentials.map((entry) => {
          const show = revealed.has(entry.id),
            website = safeWebsite(entry.website);
          return (
            <article
              key={entry.id}
              className="rounded-[24px] border border-[#284735]/12 bg-white/85 p-5 shadow-[0_18px_46px_-38px_rgba(27,62,42,.6)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-serif text-2xl text-[#20352a]">{entry.name}</h2>
                  {website ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-sm font-semibold text-[#47745b] underline underline-offset-4"
                    >
                      Open website
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => props.onEdit(entry)}
                  className="rounded-xl bg-[#edf3e9] px-3 py-2 text-sm font-bold text-[#315443]"
                >
                  Edit
                </button>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-[#758079]">Username</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[#273b31]">{entry.username || "—"}</span>
                    {entry.username ? (
                      <button
                        type="button"
                        className="font-bold text-[#47745b]"
                        onClick={() => void copySecret(entry.username, "Username", setNotice)}
                      >
                        Copy
                      </button>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-[#758079]">Password</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[#273b31]">
                      {entry.password ? (show ? entry.password : "••••••••••••") : "—"}
                    </span>
                    {entry.password ? (
                      <>
                        <button
                          type="button"
                          className="font-bold text-[#47745b]"
                          onClick={() =>
                            setRevealed((current) => {
                              const next = new Set(current);
                              if (show) next.delete(entry.id);
                              else next.add(entry.id);
                              return next;
                            })
                          }
                        >
                          {show ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          className="font-bold text-[#47745b]"
                          onClick={() => void copySecret(entry.password, "Password", setNotice)}
                        >
                          Copy
                        </button>
                      </>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {entry.notes ? (
                <p className="mt-4 line-clamp-2 whitespace-pre-wrap border-t border-[#284735]/8 pt-4 text-sm text-[#637068]">
                  {entry.notes}
                </p>
              ) : null}
              <button
                type="button"
                disabled={props.busy}
                onClick={() => {
                  if (window.confirm(`Delete ${entry.name} from your vault?`)) void props.onDelete(entry);
                }}
                className="mt-4 text-xs font-bold text-[#a0473c] disabled:opacity-50"
              >
                Delete
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
