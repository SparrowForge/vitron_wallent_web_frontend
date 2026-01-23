"use client";

import CardApplyModal from "@/features/cards/components/CardApplyModal";
import CardDepositModal from "@/features/cards/components/CardDepositModal";
import CardFreezeModal from "@/features/cards/components/CardFreezeModal";
import CardTransactionDetailsModal from "@/features/cards/components/CardTransactionDetailsModal";
import CardViewModal from "@/features/cards/components/CardViewModal";
import {
  depositSvg,
  freezeSvg,
  settingSvg,
  viewSvg,
} from "@/shared/components/Svgs/Svg";
import DataTable, { type DataTableColumn } from "@/shared/components/DataTable";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/components/ui/Card";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { toast } from "react-toastify";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRef, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

const baseActions = [
  { key: "view", label: "View", icon: viewSvg },
  { key: "deposit", label: "Deposit", icon: depositSvg },
];

const virtualActions = (isFrozen: boolean) => [
  ...baseActions,
  { key: "freeze", label: isFrozen ? "Unfreeze" : "Freeze", icon: freezeSvg },
];

const physicalActions = [
  ...baseActions,
  { key: "settings", label: "Settings", icon: settingSvg },
];

type ApiCard = {
  id?: string | number;
  cardId?: string | number;
  cardNo?: string;
  alias?: string;
  cardType?: string;
  type?: number | string;
  status?: string;
  frozenFeat?: number | string;
};

type CardListResponse = {
  code?: number | string;
  msg?: string;
  data?: ApiCard[];
};

type CardBalanceResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    balance?: string | number;
    currency?: string;
  };
};

type CardRecord = {
  tradeId?: string;
  orderId?: string;
  amount?: string;
  currency?: string;
  type?: string;
  typeString?: string;
  createTime?: string;
};

type CardRecordResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    total?: number;
    size?: number;
    pages?: number;
    current?: number;
    records?: CardRecord[];
  };
};

const getCardId = (card: ApiCard) =>
  String(card.cardId ?? card.id ?? card.cardNo ?? "");

const getLast4 = (card: ApiCard) => {
  const source = String(card.cardNo ?? card.cardId ?? card.id ?? "");
  return source.length >= 4 ? source.slice(-4) : source || "----";
};

const formatOrderId = (value?: string) => {
  if (!value) return "--";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

export default function CardsDashboard() {
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState("-1");
  const [typeFilter, setTypeFilter] = useState("-1");
  const [viewOpen, setViewOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");


  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollMap = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 300; // Adjust based on card width
      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  // Transaction Filters
  const [txTypeFilter, setTxTypeFilter] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("");
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");

  const [cardBalances, setCardBalances] = useState<
    Record<string, { balance: string; currency: string }>
  >({});
  const [recordPage, setRecordPage] = useState(1);
  const [recordPages, setRecordPages] = useState(1);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [records, setRecords] = useState<CardRecord[]>([]);

  useToastMessages({ errorMessage });

  /*
   * Filter logic aligned with mobile (iOS) implementation:
   * - Status: "01" (Active), "04" (Frozen), "03" (Unactivated), "05" (Cancelled)
   * - Type: "1" (Virtual), "2" (Physical)
   */
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Mobile logic: strict string comparison
      const cardStatus = String(card.status ?? "");
      // const cardType = String(card.type ?? card.cardType ?? ""); 
      // Note: Mobile uses 'type' field primarily. We should check if 'type' behaves as expected.
      // In JS we need to be careful with null/undefined.
      const cardType = String(card.type ?? "");

      if (statusFilter !== "-1" && cardStatus !== statusFilter) {
        return false;
      }
      if (typeFilter !== "-1" && cardType !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [cards, statusFilter, typeFilter]);

  const selectedCard = useMemo(
    () =>
      filteredCards.find((card) => getCardId(card) === selectedId) ??
      filteredCards[0] ??
      null,
    [filteredCards, selectedId]
  );

  const [carouselIndex, setCarouselIndex] = useState(0);

  const getVisibleCount = () => {
    if (typeof window === "undefined") return 1;
    const w = window.innerWidth;
    if (w >= 1024) return 3; // lg
    if (w >= 640) return 2;  // sm
    return 1;                // mobile
  };

  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const update = () => setVisibleCount(getVisibleCount());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    // keep index valid when filters or screen size changes
    const maxIndex = Math.max(0, filteredCards.length - visibleCount);
    setCarouselIndex((i) => Math.min(i, maxIndex));
  }, [filteredCards.length, visibleCount]);

  const refreshBalances = async (cardList: ApiCard[]) => {
    const balanceEntries = await Promise.all(
      cardList.map(async (card) => {
        const cardKey = getCardId(card);
        if (!cardKey) {
          return [cardKey, null] as const;
        }
        try {
          const balanceResponse = await apiRequest<CardBalanceResponse>({
            path: `${API_ENDPOINTS.cardHide}?cardId=${encodeURIComponent(
              cardKey
            )}`,
            method: "GET",
          });
          if (!balanceResponse.data) {
            return [cardKey, null] as const;
          }
          const balanceValue =
            balanceResponse.data.balance !== undefined
              ? String(balanceResponse.data.balance)
              : "0.00";
          return [
            cardKey,
            {
              balance: balanceValue,
              currency: balanceResponse.data.currency ?? "USD",
            },
          ] as const;
        } catch {
          return [cardKey, null] as const;
        }
      })
    );
    setCardBalances(
      balanceEntries.reduce((acc, [key, value]) => {
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, { balance: string; currency: string }>)
    );
  };

  const refreshCards = async () => {
    // Force a full browser reload to get updated data from server
    window.location.reload();
  };

  useEffect(() => {
    let mounted = true;
    const loadCards = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest<CardListResponse>({
          path: API_ENDPOINTS.cardList,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!Array.isArray(response.data)) {
          throw new Error(response.msg || "Unable to load cards.");
        }
        if (!mounted) {
          return;
        }
        setCards(response.data);
        const firstId =
          response.data.length > 0 ? getCardId(response.data[0]) : "";
        setSelectedId((current) => current || firstId);
        refreshBalances(response.data);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setCards([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load cards."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCards();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (filteredCards.length === 0) {
      if (selectedId) {
        setSelectedId("");
      }
      return;
    }
    const selectedExists = filteredCards.some(
      (card) => getCardId(card) === selectedId
    );
    if (!selectedExists) {
      setSelectedId(getCardId(filteredCards[0]));
    }
  }, [filteredCards, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setRecords([]);
      setRecordPages(1);
      setRecordTotal(0);
      return;
    }
    setRecordPage(1);
    setTxTypeFilter("");
    setTxStatusFilter("");
    setTxStartDate("");
    setTxEndDate("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let mounted = true;
    const loadRecords = async () => {
      setRecordLoading(true);
      setRecordError("");
      try {
        const response = await apiRequest<CardRecordResponse>({
          path: API_ENDPOINTS.cardRecordPage,
          method: "POST",
          body: JSON.stringify({
            cardId: selectedId,
            pageIndex: recordPage,
            pageSize: 10,
            type: txTypeFilter || undefined,
            status: txStatusFilter || undefined,
            createTimeStart: txStartDate ? `${txStartDate} 00:00:00` : undefined,
            createTimeEnd: txEndDate ? `${txEndDate} 23:59:59` : undefined,
          }),
        });
        if (!mounted) {
          return;
        }
        if (!response.data) {
          setRecords([]);
          setRecordPages(1);
          setRecordTotal(0);
          return;
        }
        setRecords(response.data.records ?? []);
        setRecordPages(response.data.pages ?? 1);
        setRecordTotal(response.data.total ?? 0);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setRecords([]);
        setRecordPages(1);
        setRecordTotal(0);
        setRecordError(
          error instanceof Error
            ? error.message
            : "Unable to load card transactions."
        );
      } finally {
        if (mounted) {
          setRecordLoading(false);
        }
      }
    };

    loadRecords();
    return () => {
      mounted = false;
    };
  }, [selectedId, recordPage, txTypeFilter, txStatusFilter, txStartDate, txEndDate]);


  useEffect(() => {
    if (carouselIndex == 0 || carouselIndex) {
      console.log("carouselIndex", carouselIndex, filteredCards[carouselIndex])
      setSelectedId(filteredCards?.[carouselIndex]?.cardId as string)
    }
  }, [carouselIndex])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-(--paragraph)">
          <Spinner size={16} />
          Loading cards...
        </div>
        <div className="h-16 rounded-2xl border border-(--stroke) bg-(--basic-cta)" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`card-skeleton-${index}`}
              className="h-56 rounded-2xl border border-(--stroke) bg-(--basic-cta)"
            />
          ))}
        </div>
      </div>
    );
  }

  const handleAction = (action: string, cardId: string) => {
    setSelectedId(cardId);
    if (action === "view") {
      setViewOpen(true);
    }
    if (action === "deposit") {
      setDepositOpen(true);
    }
    if (action === "freeze") {
      setFreezeOpen(true);
    }
  };

  const transactionsColumns: DataTableColumn<any>[] = [
    { key: "orderId", label: "Order No", className: "text-(--double-foreground)" },
    { key: "amount", label: "Amount", className: "text-(--double-foreground)" },
    { key: "createTime", label: "Date" },
    { key: "typeString", label: "Type" },
    { key: "details", label: "" },
  ];

  const formattedRecords = records.map((record) => ({
    ...record,
    orderId: (
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
        {formatOrderId(record.orderId ?? record.tradeId)}
      </div>
    ),
    typeString: (
      <span className="inline-flex items-center justify-center rounded-lg bg-(--brand) px-3 py-1 text-xs font-medium text-(--brand-10) shadow-lg shadow-(--brand)/20">
        {record.typeString ?? record.type ?? "--"}
      </span>
    ),
    amount: `${record.amount ?? "--"} ${record.currency ?? ""}`,
    createTime: record.createTime ?? "--",
    details: (
      <button className="text-(--paragraph) hover:text-(--brand) transition-colors">
        <Eye size={16} />
      </button>
    ),
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--foreground)">
            Manage your linked cards.
          </p>
        </div>
        <Button onClick={() => setApplyOpen(true)}>Apply for Card</Button>
      </header>

      {cards.length > 0 && (
        <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta)/50 my-2 py-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-(--paragraph) sm:text-sm">
            <span className="text-(--foreground) font-medium">Filter cards</span>
            <label className="flex items-center gap-2">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="cursor-pointer rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
              >
                <option value="-1" className="bg-(--basic-cta)">
                  All
                </option>
                <option value="01" className="bg-(--basic-cta)">
                  Active
                </option>
                <option value="04" className="bg-(--basic-cta)">
                  Freeze
                </option>
                <option value="03" className="bg-(--basic-cta)">
                  Unactivated
                </option>
                <option value="05" className="bg-(--basic-cta)">
                  Delete
                </option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Type</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="cursor-pointer rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
              >
                <option value="-1" className="bg-(--basic-cta)">
                  All
                </option>
                <option value="1" className="bg-(--basic-cta)">
                  Virtual
                </option>
                <option value="2" className="bg-(--basic-cta)">
                  Physical
                </option>
              </select>
            </label>
          </div>
        </section>
      )}

      {cards.length === 0 ? (
        <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta)/50 p-10 text-center backdrop-blur-sm">
          <p className="text-sm text-(--paragraph)">
            No cards yet. Apply for a card to get started.
          </p>
        </section>
      ) : filteredCards.length === 0 ? (
        <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta)/50 p-10 text-center backdrop-blur-sm">
          <p className="text-sm text-(--paragraph)">
            No cards match the selected filters.
          </p>
        </section>
      ) : (
        // <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        //   {filteredCards.map((card) => {
        //     const cardId = getCardId(card);
        //     const last4 = getLast4(card);
        //     const balance = cardBalances[cardId];
        //     const isPhysical = String(card.type) === "2";
        //     const isFrozen = card.status === "04";
        //     const actions = isPhysical
        //       ? physicalActions
        //       : virtualActions(isFrozen);

        //     const isSelected = selectedId === cardId;

        //     return (
        //       <Card
        //         key={cardId}
        //         variant={isSelected ? "glass" : "solid"}
        //         onClick={() => setSelectedId(cardId)}
        //         className={cn(
        //           "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
        //           isSelected && "ring-1 ring-(--brand)/50"
        //         )}
        //         tabIndex={0}
        //         onKeyDown={(e) => {
        //           if (e.key === "Enter" || e.key === " ") {
        //             setSelectedId(cardId);
        //           }
        //         }}
        //       >
        //         <div className="p-1">
        //           <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-(--foreground) to-gray-600 p-2 text-(--background) shadow-lg">
        //             {/* Visual Card Content */}
        //             <div className="flex justify-between items-start opacity-80">
        //               <div className="text-[10px] uppercase tracking-[0.2em]">
        //                 {card.cardType ?? "Vtron"}
        //               </div>
        //               <div className="font-bold italic opacity-60 text-xs">VISA</div>
        //             </div>

        //             <div className="text-lg font-mono tracking-widest my-2">
        //               ••••{last4}
        //             </div>

        //             <div className="flex justify-between items-end">
        //               <div>
        //                 <div className="text-[8px] uppercase opacity-60">Card Holder</div>
        //                 <div className="text-xs font-medium">{card.alias ?? "Vtron User"}</div>
        //               </div>
        //               <div className="h-5 w-8 rounded bg-white/20" />
        //             </div>

        //             {/* Shine effect */}
        //             <div className="absolute -inset-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
        //           </div>

        //           <div className="mt-2 flex items-center justify-between px-1">
        //             <div>
        //               <span className="text-lg font-bold text-(--foreground)">
        //                 {balance ? balance.balance : "--"}{" "}
        //                 <span className="text-sm font-normal text-(--paragraph)">
        //                   {balance ? balance.currency : ""}
        //                 </span>
        //               </span>
        //             </div>
        //             <div>
        //               {(() => {
        //                 switch (String(card.status)) {
        //                   case "01":
        //                     return (
        //                       <span className="rounded-full bg-(--brand)/10 px-2 py-1 text-[10px] font-semibold text-(--brand)">
        //                         Active
        //                       </span>
        //                     );
        //                   case "03":
        //                     return (
        //                       <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-[10px] font-semibold text-yellow-500">
        //                         Unactivated
        //                       </span>
        //                     );
        //                   case "04":
        //                     return (
        //                       <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-500">
        //                         Frozen
        //                       </span>
        //                     );
        //                   case "05":
        //                     return (
        //                       <span className="rounded-full bg-gray-500/10 px-2 py-1 text-[10px] font-semibold text-gray-500">
        //                         Cancelled
        //                       </span>
        //                     );
        //                   default:
        //                     return (
        //                       <span className="rounded-full bg-gray-500/10 px-2 py-1 text-[10px] font-semibold text-gray-500">
        //                         {card.status || "Unknown"}
        //                       </span>
        //                     );
        //                 }
        //               })()}
        //               {String(card.type) === "2" ? (
        //                 <span className="ml-1 rounded-full bg-purple-500/10 px-2 py-1 text-[10px] font-semibold text-purple-500">
        //                   Physical
        //                 </span>
        //               ) : (
        //                 <span className="ml-1 rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-500">
        //                   Virtual
        //                 </span>
        //               )}
        //             </div>
        //           </div>
        //         </div>

        //         <CardFooter className="mt-1 flex items-center justify-around gap-1 border-t border-(--stroke) p-1">
        //           {actions.map((action) =>
        //             action.key === "settings" ? (
        //               <Link
        //                 key={action.key}
        //                 href={`/cards/settings?card=${cardId}`}
        //                 className="flex flex-col items-center gap-1 rounded-lg p-1 text-[10px] font-medium text-(--paragraph) transition hover:bg-(--stroke)/10 hover:text-(--foreground)"
        //               >
        //                 <span className="grid h-10 w-10 place-items-center text-(--foreground)">
        //                   {action.icon ? (
        //                     <>{action.icon}</>
        //                   ) : (
        //                     action.label[0]
        //                   )}
        //                 </span>
        //                 {action.label}
        //               </Link>
        //             ) : (
        //               <button
        //                 key={action.key}
        //                 type="button"
        //                 onClick={(e) => {
        //                   e.stopPropagation();
        //                   handleAction(action.key, cardId);
        //                 }}
        //                 className="flex flex-col items-center gap-1 rounded-lg p-1 text-[10px] font-medium text-(--paragraph) transition hover:bg-(--stroke)/10 hover:text-(--foreground)"
        //               >
        //                 <span className="grid h-10 w-10 place-items-center text-(--foreground)">
        //                   {action.icon ? (
        //                     <>{action.icon}</>
        //                   ) : (
        //                     action.label[0]
        //                   )}
        //                 </span>
        //                 {action.label}
        //               </button>
        //             )
        //           )}
        //         </CardFooter>
        //       </Card>
        //     );
        //   })}
        // </section>
        <section className="relative w-full max-w-[70vw] overflow-hidden m-auto py-4">
          {/* Arrows */}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
            disabled={carouselIndex <= 0}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-(--foreground) bg-(--basic-cta)/80 p-2 text-(--foreground) backdrop-blur hover:bg-(--basic-cta) disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            aria-label="Next"
            onClick={() => {
              const maxIndex = Math.max(0, filteredCards.length - visibleCount);
              setCarouselIndex((i) => Math.min(maxIndex, i + 1));
            }}
            disabled={carouselIndex >= Math.max(0, filteredCards.length - visibleCount)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-(--foreground) bg-(--basic-cta)/80 p-2 text-(--foreground) backdrop-blur hover:bg-(--basic-cta) disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>

          {/* Viewport */}
          <div className="w-full max-w-full overflow-hidden p-2">
            {/* Track */}
            <div
              className="flex gap-4 transition-transform duration-500 ease-out will-change-transform"
              style={{
                transform: `translateX(calc(-${carouselIndex} * (100% / ${visibleCount}) - ${carouselIndex} * 1rem))`,
              }}
            >
              {filteredCards.map((card) => {
                const cardId = getCardId(card);
                const last4 = getLast4(card);
                const balance = cardBalances[cardId];
                const isPhysical = String(card.type) === "2";
                const isFrozen = card.status === "04";
                const actions = isPhysical ? physicalActions : virtualActions(isFrozen);

                const isSelected = selectedId === cardId;

                return (
                  <div
                    key={cardId}
                    className="shrink-0"
                    style={{ width: `calc(100% / ${visibleCount})` }}
                  >
                    <Card
                      variant={isSelected ? "glass" : "solid"}
                      onClick={() => setSelectedId(cardId)}
                      className={cn(
                        "w-full cursor-pointer transition-all duration-300 hover:scale-[1.01]",
                        isSelected && "ring-1 ring-(--brand)/50"
                      )}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedId(cardId);
                      }}
                    >
                      {/* ✅ keep your existing Card content exactly as-is */}
                      <div className="p-1">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-(--foreground) to-gray-600 p-2 text-(--background) shadow-lg">
                          <div className="flex justify-between items-start opacity-80">
                            <div className="text-[10px] uppercase tracking-[0.2em]">
                              {card.cardType ?? "Vtron"}
                            </div>
                            <div className="font-bold italic opacity-60 text-xs">VISA</div>
                          </div>

                          <div className="text-lg font-mono tracking-widest my-2">
                            ••••{last4}
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-[8px] uppercase opacity-60">Card Holder</div>
                              <div className="text-xs font-medium">{card.alias ?? "Vtron User"}</div>
                            </div>
                            <div className="h-5 w-8 rounded bg-white/20" />
                          </div>

                          <div className="absolute -inset-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                        </div>

                        <div className="mt-2 flex items-center justify-between px-1">
                          <div>
                            <span className="text-lg font-bold text-(--foreground)">
                              {balance ? balance.balance : "--"}{" "}
                              <span className="text-sm font-normal text-(--paragraph)">
                                {balance ? balance.currency : ""}
                              </span>
                            </span>
                          </div>
                          {/* keep your status chips as-is */}
                        </div>
                      </div>

                      <CardFooter className="mt-1 flex items-center justify-around gap-1 border-t border-(--stroke) p-1">
                        {actions.map((action) =>
                          action.key === "settings" ? (
                            <Link
                              key={action.key}
                              href={`/cards/settings?card=${cardId}`}
                              className="flex flex-col items-center gap-1 rounded-lg p-1 text-[10px] font-medium text-(--paragraph) transition hover:bg-(--stroke)/10 hover:text-(--foreground)"
                            >
                              <span className="grid h-10 w-10 place-items-center text-(--foreground)">
                                {action.icon ? <>{action.icon}</> : action.label[0]}
                              </span>
                              {action.label}
                            </Link>
                          ) : (
                            <button
                              key={action.key}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(action.key, cardId);
                              }}
                              className="flex flex-col items-center gap-1 rounded-lg p-1 text-[10px] font-medium text-(--paragraph) transition hover:bg-(--stroke)/10 hover:text-(--foreground)"
                            >
                              <span className="grid h-10 w-10 place-items-center text-(--foreground)">
                                {action.icon ? <>{action.icon}</> : action.label[0]}
                              </span>
                              {action.label}
                            </button>
                          )
                        )}
                      </CardFooter>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots */}
          {filteredCards.length > 0 && (
            <div className="mt-3 flex justify-center gap-2">
              {Array.from({
                length: Math.max(1, Math.ceil(filteredCards.length / visibleCount)),
              }).map((_, page) => {
                const targetIndex = page * visibleCount;
                const active =
                  carouselIndex >= targetIndex &&
                  carouselIndex < targetIndex + visibleCount;

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCarouselIndex(targetIndex)}
                    className={cn(
                      "h-2 w-2 rounded-full border border-(--foreground)",
                      active ? "bg-(--brand)" : "bg-(--basic-cta)"
                    )}
                    aria-label={`Go to page ${page + 1}`}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {filteredCards.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-(--paragraph) sm:text-sm bg-(--basic-cta)/50 p-4 rounded-2xl border border-(--stroke)">
            <span className="text-(--foreground) font-medium mr-2">Filters:</span>

            {/* Transaction Type Filter */}
            <label className="flex items-center gap-2">
              <span>Type</span>
              <select
                value={txTypeFilter}
                onChange={(e) => {
                  setTxTypeFilter(e.target.value);
                  setRecordPage(1);
                }}
                className="cursor-pointer rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
              >
                <option value="" className="bg-(--basic-cta)">All</option>
                <option value="program_fee_card" className="bg-(--basic-cta)">Consumption</option>
                <option value="refund_card" className="bg-(--basic-cta)">Refund</option>
                <option value="deposit_card" className="bg-(--basic-cta)">Recharge</option>
                <option value="withdraw_card" className="bg-(--basic-cta)">Withdraw</option>
                <option value="reversal_card" className="bg-(--basic-cta)">Revoke</option>
                <option value="fee_card" className="bg-(--basic-cta)">Card Fee</option>
                <option value="atm_fee_card" className="bg-(--basic-cta)">ATM</option>
              </select>
            </label>

            {/* Transaction Status Filter */}
            <label className="flex items-center gap-2">
              <span>Status</span>
              <select
                value={txStatusFilter}
                onChange={(e) => {
                  setTxStatusFilter(e.target.value);
                  setRecordPage(1);
                }}
                className="cursor-pointer rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
              >
                <option value="" className="bg-(--basic-cta)">All</option>
                <option value="1" className="bg-(--basic-cta)">Confirming</option>
                <option value="2" className="bg-(--basic-cta)">Completed</option>
                <option value="3" className="bg-(--basic-cta)">Cancelled</option>
              </select>
            </label>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span>Date</span>
              <input
                type="date"
                value={txStartDate}
                onChange={(e) => {
                  setTxStartDate(e.target.value);
                  setRecordPage(1);
                }}
                className="rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
              />
              <span>to</span>
              <input
                type="date"
                value={txEndDate}
                onChange={(e) => {
                  setTxEndDate(e.target.value);
                  setRecordPage(1);
                }}
                className="rounded-lg border border-(--white)/10 bg-(--background)/50 px-2 py-1 text-xs text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--brand)/50 sm:text-sm"
              />
            </div>
          </div>

          <DataTable
            title={`Transaction history`}
            columns={transactionsColumns}
            data={formattedRecords}
            onRowClick={(row) => setSelectedTransaction(row)}
            emptyMessage={
              recordLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size={16} /> Loading transactions...
                </div>
              ) : recordError ? (
                <span className="text-red-500">{recordError}</span>
              ) : (
                "No transactions yet."
              )
            }
          />
        </section>
      )}

      {/* Pagination Controls */}
      {filteredCards.length > 0 && recordPages > 1 && (
        <div className="flex items-center justify-between text-xs text-(--paragraph)">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecordPage((prev) => Math.max(prev - 1, 1))}
            disabled={recordPage <= 1 || recordLoading}
          >
            Previous
          </Button>
          <span>
            Page {recordPage} of {recordPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRecordPage((prev) =>
                Math.min(prev + 1, Math.max(recordPages, 1))
              )
            }
            disabled={recordPage >= recordPages || recordLoading}
          >
            Next
          </Button>
        </div>
      )}

      <CardViewModal
        open={viewOpen}
        cardId={selectedCard?.cardId ? String(selectedCard.cardId) : ""}
        cardLabel={selectedCard?.alias ?? "Vtron Card"}
        maskedNumber={
          selectedCard?.cardNo ?? `•••• ${getLast4(selectedCard ?? {})}`
        }
        onClose={() => setViewOpen(false)}
      />
      <CardDepositModal
        open={depositOpen}
        cardId={selectedCard?.cardId ? String(selectedCard.cardId) : ""}
        cardLabel={selectedCard?.alias ?? "Vtron Card"}
        maskedNumber={
          selectedCard?.cardNo ?? `•••• ${getLast4(selectedCard ?? {})}`
        }
        onClose={() => setDepositOpen(false)}
        onSuccess={() => refreshBalances(cards)}
      />
      <CardFreezeModal
        open={freezeOpen}
        cardId={selectedCard?.cardId ? String(selectedCard.cardId) : ""}
        cardLabel={selectedCard?.alias ?? "Vtron Card"}
        status={selectedCard?.status ?? ""}
        frozenFeat={selectedCard?.frozenFeat}
        onClose={() => setFreezeOpen(false)}
        onSuccess={refreshCards}
      />
      <CardApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} />
      <CardTransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
