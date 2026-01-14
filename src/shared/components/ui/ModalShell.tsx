"use client";

import type { ReactNode } from "react";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

export default function ModalShell({
  open,
  onClose,
  ariaLabel,
  className = "",
  children,
}: ModalShellProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div
        className={`w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6 shadow-2xl ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
