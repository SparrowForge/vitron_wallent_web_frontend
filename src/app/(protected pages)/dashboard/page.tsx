"use client";

import DataTable, { type DataTableColumn } from "@/components/DataTable";
import Spinner from "@/components/ui/Spinner";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { useEffect, useMemo, useState } from "react";

type TransactionRow = {
  order: string;
  type: string;
  amount: string;
  date: string;
};

const columns: DataTableColumn<TransactionRow>[] = [
  { key: "order", label: "Order ID" },
  { key: "type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "date", label: "Date", className: "text-right" },
];

type TransactionRecord = {
  tradeId?: string;
  orderId?: string;
  type?: string;
  typeString?: string | null;
  currency?: string;
  createTime?: string;
  amount?: string;
};

type TransactionResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    total?: number;
    size?: number;
    pages?: number;
    current?: number;
    records?: TransactionRecord[];
  };
};

type Wallet = {
  id: number;
  amount: string;
  currency: string;
};

type WalletListResponse = {
  code?: number | string;
  msg?: string;
  data?: Wallet[];
};

export default function DashboardPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [transactionPages, setTransactionPages] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [transactionError, setTransactionError] = useState("");

  const totalAmount = useMemo(() => {
    if (wallets.length === 0) {
      return 0;
    }
    return wallets.reduce((sum, wallet) => {
      const value = Number(wallet.amount);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  }, [wallets]);

  const currency = wallets[0]?.currency ?? "USD";

  useEffect(() => {
    const loadWallets = async () => {
      setLoading(true);
      try {
        const response = await apiRequest<WalletListResponse>({
          path: API_ENDPOINTS.walletList,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (Number(response.code) === 200 && response.data) {
          setWallets(response.data);
        } else {
          setWallets([]);
        }
      } catch {
        setWallets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadWallets();
  }, []);

  useEffect(() => {
    const loadTransactions = async () => {
      setTransactionLoading(true);
      setTransactionError("");
      try {
        const response = await apiRequest<TransactionResponse>({
          path: API_ENDPOINTS.merchantTransactions,
          method: "POST",
          body: JSON.stringify({
            pageIndex: transactionPage,
            pageSize: 10,
          }),
        });
        if (Number(response.code) !== 200 || !response.data) {
          setTransactions([]);
          setTransactionPages(1);
          setTransactionError(response.msg || "Unable to load transactions.");
          return;
        }
        const records = response.data.records ?? [];
        const mapped = records.map((record) => ({
          order: record.orderId ?? record.tradeId ?? "--",
          type: record.typeString ?? record.type ?? "--",
          amount: record.amount
            ? `${record.amount} ${record.currency ?? "USD"}`
            : "--",
          date: record.createTime ?? "--",
        }));
        setTransactions(mapped);
        setTransactionPages(response.data.pages ?? 1);
      } catch (error) {
        setTransactions([]);
        setTransactionPages(1);
        setTransactionError(
          error instanceof Error ? error.message : "Unable to load transactions."
        );
      } finally {
        setTransactionLoading(false);
      }
    };

    void loadTransactions();
  }, [transactionPage]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-(--paragraph) sm:text-sm sm:tracking-[0.2em]">
          Wallet Snapshot
        </p>
        <h1 className="text-2xl font-semibold text-(--foreground) sm:text-3xl">
          Track balances and monitor activity.
        </h1>
      </header>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-4 sm:p-6">
          <p className="text-xs text-(--paragraph) sm:text-sm">Total Balance</p>
          <p className="mt-3 text-xl font-semibold text-(--foreground) sm:text-2xl">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-(--paragraph)">
                <Spinner size={16} />
                Loading...
              </span>
            ) : (
              `${totalAmount.toFixed(2)} ${currency}`
            )}
          </p>
        </div>
      </section>

      <DataTable
        title="Latest transactions"
        columns={columns}
        data={transactions}
        emptyMessage={
          transactionLoading ? (
            <span className="inline-flex items-center justify-center gap-2 text-(--paragraph)">
              <Spinner size={16} />
              Loading transactions...
            </span>
          ) : (
            transactionError || "No transactions yet."
          )
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-(--paragraph)">
        <span>
          Page {transactionPage} of {transactionPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-(--stroke) bg-(--basic-cta) px-3 py-1 text-(--double-foreground)"
            onClick={() => setTransactionPage((prev) => Math.max(prev - 1, 1))}
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
            disabled={transactionPage >= transactionPages || transactionLoading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
