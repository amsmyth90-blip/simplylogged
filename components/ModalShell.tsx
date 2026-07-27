"use client";

import type { ReactNode } from "react";

import { UiIcon } from "@/components/UiIcon";

type ModalShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function ModalShell({ open, title, subtitle, onClose, children, footer }: ModalShellProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/70 bg-[#fffaf2]/95 shadow-[0_30px_80px_rgba(31,41,55,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm leading-6 text-ink/55">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/80 text-ink/60 transition hover:bg-white hover:text-ink"
          >
            <UiIcon name="plus" className="h-4 w-4 rotate-45" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="border-t border-black/5 px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
