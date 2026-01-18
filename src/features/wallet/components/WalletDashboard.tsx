"use client";

import DepositModal from "@/features/wallet/components/modals/DepositModal";
import ReceiveModal from "@/features/wallet/components/modals/ReceiveModal";
import SendModal from "@/features/wallet/components/modals/SendModal";
import WithdrawModal from "@/features/wallet/components/modals/WithdrawModal";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import {
  depositSvg,
  receiveSvg,
  sendSvg,
  withdrawSvg,
} from "@/shared/components/Svgs/Svg";
import DataTable, { type DataTableColumn } from "@/shared/components/DataTable";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { toast } from "react-toastify";
import { useCallback, useEffect, useMemo, useState } from "react";

type Wallet = {
  id: number;
  name?: string;
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
      order: React.ReactNode;
      amount: string;
      date: string;
      status: React.ReactNode;
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
          order: (
            <div
              className="cursor-pointer hover:border-(--brand) hover:text-(--brand)"
              title={record.orderId ?? record.tradeId ?? "--"}
              onClick={async (e) => {
                e.stopPropagation();
                const text = record.orderId ?? record.tradeId ?? "";
                if (text) {
                  await navigator.clipboard.writeText(text);
                  toast.success("Order ID copied!", {
                    autoClose: 2000,
                    position: "top-center",
                    hideProgressBar: true,
                    className: "!bg-(--background) !text-(--foreground) border border-(--stroke)",
                  });
                }
              }}
            >
              {maskOrder(record.orderId ?? record.tradeId ?? "--")}
            </div>
          ),
          orderFull: record.orderId ?? record.tradeId ?? "--",
          amount: record.amount
            ? `${record.amount} ${record.currency ?? "USD"}`
            : "--",
          date: record.createTime?.split(" ")[0] ?? "--",
          status: (
            <span className="inline-flex items-center justify-center rounded-lg bg-(--brand) px-3 py-1 text-xs font-medium text-(--brand-10) shadow-lg shadow-(--brand)/20">
              {record.typeString ?? record.type ?? "--"}
            </span>
          ),
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

  const walletColumns: DataTableColumn<{
    id: string;
    order: React.ReactNode;
    amount: string;
    date: string;
    status: React.ReactNode;
  }>[] = [
      { key: "order", label: "Order No", className: "text-(--double-foreground)" },
      { key: "amount", label: "Amount", className: "font-medium text-(--double-foreground)" },
      { key: "date", label: "Date" },
      { key: "status", label: "Type" },
    ];

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
      <section className="flex flex-col gap-6">
        <Card variant="glass" className="relative overflow-hidden w-[85vw] md:w-auto">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-(--paragraph) sm:text-sm">
                  <span className="h-2 w-2 rounded-full bg-(--brand) shadow-[0_0_8px_var(--brand)]" />
                  <label className="flex items-center gap-2">
                    <span>Wallet</span>
                    <select
                      value={selectedId ?? ""}
                      onChange={(event) => setSelectedId(Number(event.target.value))}
                      className="cursor-pointer rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
                    >
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id} className="bg-(--basic-cta)">
                          {wallet.currency} Wallet
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="text-(--placeholder)">
                    {selectedWallet.currency}
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-(--brand) sm:text-5xl tracking-tight">
                    {formatAmount(selectedWallet.amount, selectedWallet.currency)}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-(--paragraph) sm:text-sm">
                    <span className="flex items-center gap-1">
                      Available: <span className="text-(--foreground)">{formatAmount(selectedWallet.amount, selectedWallet.currency)}</span>
                    </span>
                    <span className="h-3 w-px bg-(--white)/10" />
                    <span className="flex items-center gap-1">
                      Freeze: <span className="text-(--foreground)">{formatAmount(selectedWallet.frozenAmount, selectedWallet.currency)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 sm:gap-4 md:flex md:items-center">
                {actions.map((action) => (
                  <Button
                    key={action.key}
                    variant="ghost"
                    className="flex flex-col gap-2 h-auto py-3 px-2 sm:px-4 hover:bg-(--white)/5"
                    onClick={() => {
                      if (action.key === "deposit") setDepositOpen(true);
                      if (action.key === "withdraw") setWithdrawOpen(true);
                      if (action.key === "send") setSendOpen(true);
                      if (action.key === "receive") setReceiveOpen(true);
                    }}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-(--brand)/10 text-(--brand) transition-transform group-hover:scale-110 sm:h-12 sm:w-12 sm:rounded-2xl">
                      {action.icon}
                    </span>
                    <span className="text-[10px] font-medium text-(--paragraph) group-hover:text-(--foreground) sm:text-xs">
                      {action.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <DataTable
        title="Transaction History"
        columns={walletColumns}
        data={transactions}
        emptyMessage={
          transactionLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner size={16} /> Loading transactions...
            </div>
          ) : transactionError ? (
            <span className="text-red-500">{transactionError}</span>
          ) : (
            "No transactions available."
          )
        }
      />

      <div className="flex items-center justify-between text-xs text-(--paragraph)">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTransactionPage((prev) => Math.max(prev - 1, 1))}
          disabled={transactionPage <= 1 || transactionLoading}
        >
          Previous
        </Button>
        <span>
          Page {transactionPage} of {transactionPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setTransactionPage((prev) => Math.min(prev + 1, transactionPages))
          }
          disabled={transactionPage >= transactionPages || transactionLoading}
        >
          Next
        </Button>
      </div>
      <DepositModal
        open={depositOpen}
        walletName={selectedWallet.name ?? `${selectedWallet.currency} Wallet`}
        onClose={() => setDepositOpen(false)}
      />
      <SendModal
        open={sendOpen}
        walletName={selectedWallet.name ?? `${selectedWallet.currency} Wallet`}
        onSuccess={loadWallets}
        onClose={() => setSendOpen(false)}
      />
      <ReceiveModal
        open={receiveOpen}
        walletName={selectedWallet.name ?? `${selectedWallet.currency} Wallet`}
        onClose={() => setReceiveOpen(false)}
      />
      <WithdrawModal
        open={withdrawOpen}
        walletName={selectedWallet.name ?? `${selectedWallet.currency} Wallet`}
        onSuccess={loadWallets}
        onClose={() => setWithdrawOpen(false)}
      />
    </div >
  );
}
