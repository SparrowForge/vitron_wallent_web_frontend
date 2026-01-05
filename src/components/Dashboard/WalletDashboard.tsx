"use client";

import {
  depositSvg,
  receiveSvg,
  sendSvg,
  withdrawSvg,
} from "@/components/Svgs/Svg";
import DepositModal from "@/components/Transaction Modal/DepositModal";
import ReceiveModal from "@/components/Transaction Modal/ReceiveModal";
import SendModal from "@/components/Transaction Modal/SendModal";
import WithdrawModal from "@/components/Transaction Modal/WithdrawModal";
import { useMemo, useState } from "react";

const wallets = [
  {
    id: "wallet-1",
    name: "Wallet 1",
    date: "01/07/2025",
    balance: "$88,281.74",
    available: "$75,200.00",
    freeze: "$13,081.74",
    transactions: [
      {
        id: "01",
        order: "CND1937186987687043072",
        amount: "+$200.00",
        date: "2025-06-23 22:32:23",
        status: "Complete",
      },
      {
        id: "02",
        order: "CND1937186987687043072",
        amount: "-$100.00",
        date: "2025-06-24 11:15:00",
        status: "Pending",
      },
      {
        id: "03",
        order: "CND1937186987687043072",
        amount: "+$120.00",
        date: "2025-06-25 09:45:12",
        status: "In Progress",
      },
    ],
  },
  {
    id: "wallet-2",
    name: "Wallet 2",
    date: "01/07/2025",
    balance: "$24,190.10",
    available: "$20,000.00",
    freeze: "$4,190.10",
    transactions: [
      {
        id: "01",
        order: "CND1937186987687043072",
        amount: "+$320.00",
        date: "2025-06-20 18:12:10",
        status: "Complete",
      },
      {
        id: "02",
        order: "CND1937186987687043072",
        amount: "-$80.00",
        date: "2025-06-22 10:30:00",
        status: "Pending",
      },
    ],
  },
];

const actions = [
  { key: "deposit", label: "Deposit", icon: depositSvg },
  { key: "withdraw", label: "Withdraw", icon: withdrawSvg },
  { key: "send", label: "Send", icon: sendSvg },
  { key: "receive", label: "Receive", icon: receiveSvg },
];

export default function WalletDashboard() {
  const [selectedId, setSelectedId] = useState(wallets[0]?.id ?? "");
  const [depositOpen, setDepositOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedId) ?? wallets[0],
    [selectedId]
  );

  if (!selectedWallet) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6">
          <div className="flex items-center gap-3 text-sm text-(--paragraph)">
            <span className="h-2 w-2 rounded-full bg-(--brand)" />
            <label className="flex items-center gap-2">
              <span>Wallet</span>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="rounded-lg border border-(--stroke) bg-(--background) px-2 py-1 text-sm text-(--foreground) focus:outline-none"
              >
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-(--placeholder)">{selectedWallet.date}</span>
          </div>
          <div className="mt-4 text-3xl font-semibold text-(--brand)">
            {selectedWallet.balance}
          </div>
          <div className="mt-2 text-xs text-(--paragraph)">
            Available: {selectedWallet.available} · Freeze:{" "}
            {selectedWallet.freeze}
          </div>
        </div>

        <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                data-action={action.key}
                data-wallet={selectedWallet.id}
                onClick={() => {
                  if (action.key === "deposit") {
                    setDepositOpen(true);
                  }
                  if (action.key === "withdraw") {
                    setWithdrawOpen(true);
                  }
                  if (action.key === "send") {
                    setSendOpen(true);
                  }
                  if (action.key === "receive") {
                    setReceiveOpen(true);
                  }
                }}
                className="flex flex-col items-center gap-3 text-sm text-(--paragraph) transition hover:text-(--foreground)"
              >
                <span className="grid h-11 w-11 place-items-center">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-(--foreground)">
            Transaction History
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-(--paragraph) hover:text-(--foreground)"
          >
            All
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-(--paragraph)">
              <tr className="border-b border-(--stroke)">
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Order No</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date and Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-(--double-foreground)">
              {selectedWallet.transactions.map((row) => (
                <tr key={row.id} className="border-b border-(--stroke)">
                  <td className="px-4 py-4 text-(--paragraph)">{row.id}</td>
                  <td className="px-4 py-4">{row.order}</td>
                  <td className="px-4 py-4">{row.amount}</td>
                  <td className="px-4 py-4">{row.date}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-(--brand-10) px-3 py-1 text-xs text-(--brand)">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <DepositModal
        open={depositOpen}
        walletName={selectedWallet.name}
        onClose={() => setDepositOpen(false)}
      />
      <SendModal
        open={sendOpen}
        walletName={selectedWallet.name}
        onClose={() => setSendOpen(false)}
      />
      <ReceiveModal
        open={receiveOpen}
        walletName={selectedWallet.name}
        onClose={() => setReceiveOpen(false)}
      />
      <WithdrawModal
        open={withdrawOpen}
        walletName={selectedWallet.name}
        onClose={() => setWithdrawOpen(false)}
      />
    </div>
  );
}
