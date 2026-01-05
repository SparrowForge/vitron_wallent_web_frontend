type ReceiveModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
};

export default function ReceiveModal({
  open,
  walletName,
  onClose,
}: ReceiveModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Receive"
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
          <div className="text-sm font-semibold text-(--foreground)">Receive</div>
          <span className="text-xs text-(--paragraph)">{walletName}</span>
        </div>

        <div className="mt-6 rounded-3xl border border-(--stroke) bg-(--background) px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--basic-cta) text-(--foreground)">
            <span className="text-lg font-semibold">E</span>
          </div>
          <div className="mt-4 text-lg font-semibold text-(--foreground)">
            10001 (ID)
          </div>
          <div className="mt-1 text-xs text-(--paragraph)">
            user@example.com
          </div>

          <div className="mt-6 grid place-items-center">
            <div className="grid h-44 w-44 place-items-center rounded-2xl border border-(--stroke) bg-(--basic-cta)">
              <span className="text-xs text-(--paragraph)">QR</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-(--paragraph)">
          Scan the QR code above to receive payment.
        </p>

        <button
          type="button"
          className="mt-4 h-12 w-full rounded-2xl bg-(--brand) text-sm font-semibold text-(--background)"
        >
          Save picture
        </button>
      </div>
    </div>
  );
}
