type CardViewModalProps = {
  open: boolean;
  cardLabel: string;
  last4: string;
  onClose: () => void;
};

export default function CardViewModal({
  open,
  cardLabel,
  last4,
  onClose,
}: CardViewModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Card view"
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
          <div className="text-sm font-semibold text-(--foreground)">View</div>
          <span className="text-xs text-(--paragraph)">{cardLabel}</span>
        </div>

        <div className="mt-6 rounded-3xl border border-(--stroke) bg-(--background) p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-(--paragraph)">
            Vtron
          </div>
          <div className="mt-10 text-xl font-semibold text-(--foreground)">
            •••• {last4}
          </div>
          <div className="mt-4 text-xs text-(--paragraph)">CARD HOLDER</div>
          <div className="text-sm text-(--double-foreground)">Esha A.</div>
          <div className="mt-6 flex items-center justify-between text-xs text-(--paragraph)">
            <span>VALID THRU</span>
            <span className="text-(--double-foreground)">08/29</span>
          </div>
          <div className="mt-6 text-right text-sm font-semibold text-(--double-foreground)">
            VISA
          </div>
        </div>
      </div>
    </div>
  );
}
