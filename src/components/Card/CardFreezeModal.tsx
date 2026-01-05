type CardFreezeModalProps = {
  open: boolean;
  cardLabel: string;
  onClose: () => void;
};

export default function CardFreezeModal({
  open,
  cardLabel,
  onClose,
}: CardFreezeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Freeze card"
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
          <div className="text-sm font-semibold text-(--foreground)">Freeze</div>
          <span className="text-xs text-(--paragraph)">{cardLabel}</span>
        </div>

        <div className="mt-6 rounded-3xl border border-(--stroke) bg-(--background) p-6">
          <p className="text-sm text-(--double-foreground)">
            Freeze this card to prevent new transactions. You can unfreeze it
            anytime.
          </p>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--basic-cta) px-4 py-3 text-sm">
            <span className="text-(--paragraph)">Card status</span>
            <span className="text-(--brand)">Active</span>
          </div>
          <button
            type="button"
            className="mt-6 h-12 w-full rounded-2xl bg-(--brand) text-sm font-semibold text-(--background)"
          >
            Freeze Card
          </button>
        </div>
      </div>
    </div>
  );
}
