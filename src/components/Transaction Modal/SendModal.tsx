type SendModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
};

export default function SendModal({ open, walletName, onClose }: SendModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Send"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-(--stroke) bg-(--background) px-3 py-2 text-xs font-semibold text-(--paragraph)"
          >
            Back
          </button>
          <div className="text-sm font-semibold text-(--foreground)">Send</div>
          <span className="text-xs text-(--paragraph)">{walletName}</span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Receive account
            <input
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Please input email"
            />
          </label>
        </div>

        <button
          type="button"
          className="mt-10 h-12 w-full rounded-2xl bg-(--stroke) text-sm font-semibold text-(--placeholder)"
        >
          Next
        </button>
      </div>
    </div>
  );
}
