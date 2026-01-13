"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/components/ui/Spinner";
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
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Unable to load notices.");
        return;
      }
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${
                    filterType === option.value
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

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="space-y-6">
          {items.length === 0 && !loading ? (
            <div className="rounded-2xl border border-(--stroke) bg-(--background) p-6 text-sm text-(--paragraph)">
              No notifications yet.
            </div>
          ) : null}

          {items.map((item, index) => {
            const isActivation = Number(item.type) === 2;
            return (
              <div
                key={`${item.opt ?? "notice"}-${index}`}
                className="rounded-2xl border border-(--stroke) bg-(--background) p-5"
              >
                <div className="flex items-center justify-between text-xs text-(--paragraph)">
                  <span>{isActivation ? "Activation code" : "3D Secure code"}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.opt)}
                    className="inline-flex items-center gap-2 text-(--brand)"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <div className="mt-2 text-2xl font-semibold text-(--foreground)">
                  {item.opt || "-"}
                </div>
                <div className="mt-4 h-px bg-(--stroke)" />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-(--paragraph)">
                  <div>
                    <div className="text-(--placeholder)">Card number</div>
                    <div className="mt-1 text-sm text-(--double-foreground)">
                      {formatCardNo(item.cardNo)}
                    </div>
                  </div>
                  {!isActivation ? (
                    <div>
                      <div className="text-(--placeholder)">Amount</div>
                      <div className="mt-1 text-sm text-(--double-foreground)">
                        {typeof item.amount === "number"
                          ? item.amount.toFixed(2)
                          : item.amount ?? "-"}{" "}
                        {item.currency ?? ""}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-(--placeholder)">Date</div>
                    <div className="mt-1 text-sm text-(--double-foreground)">
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
              className="w-full rounded-2xl border border-(--stroke) bg-(--background) py-3 text-sm font-semibold text-(--double-foreground)"
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
        {errorMessage ? (
          <p className="mt-4 text-xs text-(--paragraph)">{errorMessage}</p>
        ) : null}
        {infoMessage ? (
          <p className="mt-2 text-xs text-(--paragraph)">{infoMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
