type WithdrawModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
};

export default function WithdrawModal({
  open,
  walletName,
  onClose,
}: WithdrawModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Withdrawal"
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
          <div className="text-sm font-semibold text-(--foreground)">
            Withdrawal
          </div>
          <span className="text-xs text-(--paragraph)">{walletName}</span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Currency
            <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
              USDT
            </div>
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Network
            <div className="flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
              <span className="text-(--placeholder)">Please choose</span>
              <span className="text-(--placeholder)">▾</span>
            </div>
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Payment address
            <input
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Please input"
            />
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Withdrawal amount
            <div className="flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm">
              <input
                className="w-full bg-transparent text-(--foreground) placeholder:text-(--placeholder) focus:outline-none"
                placeholder="Minimum 10.00"
              />
              <span className="ml-3 text-(--double-foreground)">USD</span>
              <button type="button" className="ml-3 text-(--brand)">
                Max
              </button>
            </div>
            <div className="text-xs text-(--paragraph)">
              Available: 753.49 USD
            </div>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--paragraph)">
          <div className="flex items-center justify-between">
            <span>Fee</span>
            <span className="text-(--double-foreground)">0.00 USD</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Received amount</span>
            <span className="text-(--double-foreground)">0.00 USDT</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 h-12 w-full rounded-2xl bg-(--stroke) text-sm font-semibold text-(--placeholder)"
        >
          Withdrawal
        </button>
      </div>
    </div>
  );
}
