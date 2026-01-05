type DepositModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
};

export default function DepositModal({
  open,
  walletName,
  onClose,
}: DepositModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Deposit crypto"
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
          <div className="text-sm font-semibold text-(--foreground)">Top up</div>
          <span className="text-xs text-(--paragraph)">{walletName}</span>
        </div>

        <div className="mt-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-(--stroke) bg-(--background) px-4 py-2 text-sm text-(--double-foreground)">
            <span>USDT-ERC20</span>
            <span className="text-(--placeholder)">▾</span>
          </div>
        </div>

        <div className="mt-6 grid place-items-center">
          <div className="grid h-48 w-48 place-items-center rounded-2xl border border-(--stroke) bg-(--background)">
            <span className="text-xs text-(--paragraph)">QR</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--double-foreground)">
          <span className="truncate">
            0xca9a3a2c747d6f15462ab7c5f274bb45fb4d2d63
          </span>
          <button type="button" className="text-(--brand)">
            Copy
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--paragraph)">
          <div className="flex items-center justify-between">
            <span>Ratio</span>
            <span className="text-(--double-foreground)">1 USDT = 1 USD</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Top up rates</span>
            <span className="text-(--double-foreground)">2%</span>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-xs text-(--paragraph)">
          <li>
            This address only accepts USDT recharges from the corresponding
            network.
          </li>
          <li>Please don’t recharge any assets other than USDT.</li>
        </ul>
      </div>
    </div>
  );
}
