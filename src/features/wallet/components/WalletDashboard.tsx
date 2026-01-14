"use client";

import {
  depositSvg,
  receiveSvg,
  sendSvg,
  withdrawSvg,
} from "@/shared/components/Svgs/Svg";
import DepositModal from "@/features/wallet/components/modals/DepositModal";
import ReceiveModal from "@/features/wallet/components/modals/ReceiveModal";
import SendModal from "@/features/wallet/components/modals/SendModal";
import WithdrawModal from "@/features/wallet/components/modals/WithdrawModal";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { useCallback, useEffect, useMemo, useState } from "react";

type Wallet = {
  id: number;
  merchantId?: number;
  amount: string;
  frozenAmount: string;
  currency: string;
  url?: string;
};

type WalletListResponse = {
  code?: number | string;
  msg?: string;
  data?: Wallet[];
};

const actions = [
  { key: "deposit", label: "Deposit", icon: depositSvg },
  { key: "withdraw", label: "Withdraw", icon: withdrawSvg },
  { key: "send", label: "Send", icon: sendSvg },
  { key: "receive", label: "Receive", icon: receiveSvg },
];

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return { token: "" };
  }
  return {
    token: localStorage.getItem("vtron_access_token") ?? "",
  };
};

const formatAmount = (value: string, currency: string) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numeric);
};

const maskOrder = (order: string) => {
  if (order.length <= 8) {
    return order;
  }
  return `${order.slice(0, 4)}....${order.slice(-4)}`;
};

export default function WalletDashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [transactions, setTransactions] = useState<
    {
      id: string;
      order: string;
      amount: string;
      date: string;
      status: string;
    }[]
  >([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPages, setTransactionPages] = useState(1);
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [transactionError, setTransactionError] = useState("");

  useToastMessages({ errorMessage, warningMessage: transactionError });
  const selectedWallet = useMemo(
    () =>
      wallets.find((wallet) => wallet.id === selectedId) ?? wallets[0] ?? null,
    [selectedId, wallets]
  );

  const loadWallets = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const { token } = getStoredToken();
      if (!token) {
        setWallets([]);
        setErrorMessage("Please login to view your wallets.");
        return;
      }
      const response = await apiRequest<WalletListResponse>({
        path: API_ENDPOINTS.walletList,
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!response.data) {
        setWallets([]);
        setErrorMessage(response.msg || "Unable to load wallets.");
        return;
      }
      const list = response.data ?? [];
      setWallets(list);
      setSelectedId(list[0]?.id ?? null);
    } catch (error) {
      setWallets([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load wallets."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    const loadTransactions = async () => {
      setTransactionLoading(true);
      setTransactionError("");
      try {
        const response = await apiRequest<{
          code?: number | string;
          msg?: string;
          data?: {
            pages?: number;
            records?: {
              orderId?: string;
              tradeId?: string;
              type?: string;
              typeString?: string | null;
              currency?: string;
              createTime?: string;
              amount?: string;
            }[];
          };
        }>({
          path: API_ENDPOINTS.merchantTransactions,
          method: "POST",
          body: JSON.stringify({
            pageIndex: transactionPage,
            pageSize: 10,
          }),
        });

        if (!response.data) {
          setTransactions([]);
          setTransactionPages(1);
          setTransactionError(response.msg || "Unable to load transactions.");
          return;
        }

        const records = response.data.records ?? [];
        const mapped = records.map((record, index) => ({
          id: String((transactionPage - 1) * 10 + index + 1),
          order: record.orderId ?? record.tradeId ?? "--",
          amount: record.amount
            ? `${record.amount} ${record.currency ?? "USD"}`
            : "--",
          date: record.createTime ?? "--",
          status: record.typeString ?? record.type ?? "--",
        }));
        setTransactions(mapped);
        setTransactionPages(response.data.pages ?? 1);
      } catch (error) {
        setTransactions([]);
        setTransactionPages(1);
        setTransactionError(
          error instanceof Error
            ? error.message
            : "Unable to load transactions."
        );
      } finally {
        setTransactionLoading(false);
      }
    };

    void loadTransactions();
  }, [transactionPage]);

  if (!selectedWallet) {
    return (
      <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6 text-sm text-(--paragraph)">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size={16} />
            Loading wallet details...
          </span>
        ) : (
          errorMessage || "No wallets found."
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-(--paragraph) sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-(--brand)" />
            <label className="flex items-center gap-2">
              <span>Wallet</span>
              <select
                value={selectedId ?? ""}
                onChange={(event) => setSelectedId(Number(event.target.value))}
                className="rounded-lg border border-(--stroke) bg-(--background) px-2 py-1 text-xs text-(--foreground) focus:outline-none sm:text-sm"
              >
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.currency} Wallet
                  </option>
                ))}
              </select>
            </label>
            <span className="text-(--placeholder)">
              {selectedWallet.currency}
            </span>
          </div>
          <div className="mt-4 text-2xl font-semibold text-(--brand) sm:text-3xl">
            {formatAmount(selectedWallet.amount, selectedWallet.currency)}
          </div>
          <div className="mt-2 text-xs text-(--paragraph)">
            Available:{" "}
            {formatAmount(selectedWallet.amount, selectedWallet.currency)} ·
            Freeze:{" "}
            {formatAmount(selectedWallet.frozenAmount, selectedWallet.currency)}
          </div>
        </div>

        <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
                className="flex flex-col items-center gap-2 text-xs text-(--paragraph) transition hover:text-(--foreground) sm:gap-3 sm:text-sm"
              >
                <span className="grid h-10 w-10 place-items-center sm:h-11 sm:w-11">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="w-[85vw] md:w-auto rounded-2xl border border-(--stroke) bg-(--basic-cta) p-4 sm:p-6">
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

        <div className="mt-4 w-full overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="text-(--paragraph)">
              <tr className="border-b border-(--stroke)">
                <th className="px-3 py-3 sm:px-4">No</th>
                <th className="px-3 py-3 sm:px-4">Order No</th>
                <th className="hidden px-3 py-3 sm:table-cell sm:px-4">
                  Amount
                </th>
                <th className="px-3 py-3 sm:px-4">Date</th>
                <th className="px-3 py-3 sm:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-(--double-foreground)">
              {transactions.length === 0 ? (
                <tr className="border-b border-(--stroke)">
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-(--paragraph) sm:px-4"
                  >
                    {transactionLoading ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Spinner size={16} />
                        Loading transactions...
                      </span>
                    ) : (
                      transactionError || "No transactions available."
                    )}
                  </td>
                </tr>
              ) : (
                transactions.map((row) => (
                  <tr key={row.id} className="border-b border-(--stroke)">
                    <td className="px-3 py-4 text-(--paragraph) sm:px-4">
                      {row.id}
                    </td>
                    <td className="px-3 py-4 sm:px-4">
                      <span
                        className="block max-w-[140px] truncate sm:max-w-none"
                        title={row.order}
                      >
                        {maskOrder(row.order)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-4 sm:table-cell sm:px-4">
                      {row.amount}
                    </td>
                    <td className="px-3 py-4 sm:px-4">
                      {row.date.split(" ")[0]}
                    </td>
                    <td className="px-3 py-4 sm:px-4">
                      <span className="inline-flex items-center rounded-full bg-(--brand-10) px-3 py-1 text-[10px] text-(--brand) sm:text-xs">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-(--paragraph)">
          <span>
            Page {transactionPage} of {transactionPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-(--stroke) bg-(--basic-cta) px-3 py-1 text-(--double-foreground)"
              onClick={() =>
                setTransactionPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={transactionPage <= 1 || transactionLoading}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-full border border-(--stroke) bg-(--basic-cta) px-3 py-1 text-(--double-foreground)"
              onClick={() =>
                setTransactionPage((prev) =>
                  Math.min(prev + 1, transactionPages)
                )
              }
              disabled={
                transactionPage >= transactionPages || transactionLoading
              }
            >
              Next
            </button>
          </div>
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
        onSuccess={loadWallets}
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
        onSuccess={loadWallets}
        onClose={() => setWithdrawOpen(false)}
      />
    </div>
  );
}
