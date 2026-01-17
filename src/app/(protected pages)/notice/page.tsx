"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import EmptyState from "@/shared/components/ui/EmptyState";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { Copy, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NoticeItem = {
  type?: string;
  cardNo?: string;
  opt?: string;
  cardId?: string;
  amount?: number;
  currency?: string;
  authStatus?: string;
  createTime?: string;
};

type NoticeResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    total?: number;
    records?: NoticeItem[];
  };
};

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }
  return value.replace("-", ".").replace("-", ".");
};

const formatCardNo = (cardNo?: string) => {
  if (!cardNo) {
    return "-";
  }
  const sanitized = cardNo.replace(/\s+/g, "");
  if (sanitized.length <= 4) {
    return `....${sanitized}`;
  }
  return `....${sanitized.slice(-4)}`;
};

export default function NoticePage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("");
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const hasMore = useMemo(() => {
    return items.length < total;
  }, [items.length, total]);

  const loadNotices = async (pageIndex: number, replace = false) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest<NoticeResponse>({
        path: API_ENDPOINTS.messageCenterPage,
        method: "POST",
        body: JSON.stringify({
          pageIndex,
          pageSize: 10,
          type: filterType || undefined,
        }),
      });
      const records = response.data?.records ?? [];
      setTotal(response.data?.total ?? 0);
      setItems((prev) => (replace ? records : [...prev, ...records]));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load notices."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const readAll = async () => {
      try {
        await apiRequest({
          path: API_ENDPOINTS.messageCenterRead,
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch {
        return;
      }
    };
    void readAll();
  }, []);

  useEffect(() => {
    setPage(1);
    setItems([]);
    void loadNotices(1, true);
  }, [filterType]);

  const handleCopy = async (value?: string) => {
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setInfoMessage("Copied to clipboard.");
      setTimeout(() => setInfoMessage(""), 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to copy."
      );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
            Notification
          </p>
          <h1 className="text-3xl font-semibold text-(--foreground)">Notice</h1>
          <p className="text-sm text-(--paragraph)">
            The notification displays the 3D Secure authentication code for the
            card transaction and the activation code for the physical card.
            You can obtain the activation code here or retrieve it from your
            email through Activation Code Retrieval.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color)"
            aria-label="Notice filters"
            onClick={() => setFilterOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {filterOpen ? (
            <div className="absolute right-0 top-12 z-10 w-44 rounded-2xl border border-(--stroke) bg-(--basic-cta) p-2 text-xs text-(--paragraph) shadow-lg">
              {[
                { label: "All", value: "" },
                { label: "3DS", value: "1" },
                { label: "Activation code", value: "2" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setFilterType(option.value);
                    setFilterOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${filterType === option.value
                      ? "bg-(--background) text-(--double-foreground)"
                      : "text-(--paragraph)"
                    }`}
                >
                  {option.label}
                  {filterType === option.value ? "•" : ""}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="glass rounded-3xl p-6">
        <div className="space-y-4">
          {items.length === 0 && !loading ? (
            <EmptyState message="No notifications yet." />
          ) : null}

          {items.map((item, index) => {
            const isActivation = Number(item.type) === 2;
            return (
              <div
                key={`${item.opt ?? "notice"}-${index}`}
                className="group relative overflow-hidden rounded-2xl glass-card p-5 transition-all duration-300 hover:border-(--brand)/20 hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-(--white)/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-center justify-between text-xs text-(--paragraph)">
                  <span className="font-medium">{isActivation ? "Activation code" : "3D Secure code"}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.opt)}
                    className="inline-flex items-center gap-2 rounded-full bg-(--brand)/10 px-3 py-1 text-(--brand) transition hover:bg-(--brand)/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight text-(--foreground)">
                  {item.opt || "-"}
                </div>
                <div className="mt-4 h-px bg-(--white)/5" />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-(--paragraph)">
                  <div>
                    <div className="text-(--placeholder)">Card number</div>
                    <div className="mt-1 text-sm font-medium text-(--double-foreground)">
                      {formatCardNo(item.cardNo)}
                    </div>
                  </div>
                  {!isActivation ? (
                    <div>
                      <div className="text-(--placeholder)">Amount</div>
                      <div className="mt-1 text-sm font-medium text-(--double-foreground)">
                        {typeof item.amount === "number"
                          ? item.amount.toFixed(2)
                          : item.amount ?? "-"}{" "}
                        {item.currency ?? ""}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-(--placeholder)">Date</div>
                    <div className="mt-1 text-sm font-medium text-(--double-foreground)">
                      {formatDate(item.createTime)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {loading ? (
            <div className="rounded-2xl border border-(--stroke) bg-(--background) p-6 text-sm text-(--paragraph)">
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} />
                Loading notices...
              </span>
            </div>
          ) : null}
          {hasMore && !loading ? (
            <button
              type="button"
              className="w-full rounded-2xl border border-(--stroke) bg-(--background)/50 py-3 text-sm font-semibold text-(--double-foreground) transition hover:bg-(--background) hover:text-(--foreground)"
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                void loadNotices(nextPage);
              }}
            >
              Load more
            </button>
          ) : null}
        </div>
        {null}
      </section>
    </div>
  );
}
