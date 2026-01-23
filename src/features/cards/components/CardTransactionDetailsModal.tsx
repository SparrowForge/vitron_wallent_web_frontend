"use client";

import { Button } from "@/shared/components/ui/Button";
import ModalShell from "@/shared/components/ui/ModalShell";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";

type CardTransactionDetailsModalProps = {
    transaction: any | null;
    onClose: () => void;
};

export default function CardTransactionDetailsModal({
    transaction,
    onClose,
}: CardTransactionDetailsModalProps) {
    if (!transaction) return null;

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!", {
            className: "!bg-(--background) !text-(--foreground) border border-(--stroke)",
        });
    };

    const getStatusLabel = (status: number | string) => {
        switch (String(status)) {
            case "1":
                return "Confirming";
            case "2":
                return "Completed";
            case "3":
                return "Cancelled";
            default:
                return "Unknown";
        }
    };

    const getStatusColor = (status: number | string) => {
        switch (String(status)) {
            case "1":
                return "text-yellow-500";
            case "2":
                return "text-green-500";
            case "3":
                return "text-red-500";
            default:
                return "text-gray-500";
        }
    };

    const fields = [
        {
            label: "Transaction ID",
            value: transaction.orderId || transaction.orderNo || "--",
            copyable: true,
        },
        {
            label: "Merchant",
            value: transaction.consumerMerchantName || "--",
        },
        {
            label: "Card Number",
            value: transaction.cardNo ? `•••• ${transaction.cardNo}` : "--",
        },
        {
            label: "Bill Amount",
            value: transaction.transactionAmount
                ? `${transaction.transactionAmount - transaction.fee} ${transaction.transactionCurrency || transaction.currency || ""}`
                : "--",
        },
        {
            label: "Fee",
            value: transaction.fee
                ? `${transaction.fee} ${transaction.currency || ""}`
                : "0.00",
        },
        {
            label: "Total",
            value: transaction.amount
                ? `${transaction.transactionAmount} ${transaction.currency || ""}`
                : "--",
        },
        {
            label: "Date",
            value: transaction.createTime || "--",
        },
        {
            label: "Type",
            value: <span className="text-sm text-(--paragraph)">
                {transaction.typeString}
            </span>,
            colored: true,
        },
    ];

    return (
        <ModalShell
            open={!!transaction}
            onClose={onClose}
            ariaLabel="Card Transaction Details"
            className="max-w-md relative overflow-hidden"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-(--foreground)">
                    Transaction Details
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 rounded-full"
                >
                    ✕
                </Button>
            </div>

            <div className="space-y-6 py-2">
                <div className="flex flex-col items-center justify-center gap-2 pb-6 border-b border-(--stroke)">
                    <span className="text-3xl font-bold text-(--foreground)">
                        {transaction.amount
                            ? `${transaction.amount}`
                            : "--"}
                    </span>

                    <span className="inline-flex items-center justify-center rounded-lg bg-(--brand) px-3 py-1 text-xs font-medium text-(--brand-10) shadow-lg shadow-(--brand)/20">
                        {getStatusLabel(transaction.status)}
                    </span>
                </div>

                <div className="space-y-4">
                    {fields.map((field) => (
                        <div
                            key={field.label}
                            className="flex items-center justify-between text-sm"
                        >
                            <span className="text-(--paragraph)">{field.label}</span>
                            <span
                                className={`font-medium flex items-center gap-2 ${field.colored
                                    ? getStatusColor(transaction.status)
                                    : "text-(--foreground)"
                                    }`}
                            >
                                {field.value}
                                {field.copyable && (
                                    <button
                                        onClick={() => handleCopy(field.value)}
                                        className="text-(--paragraph) hover:text-(--brand) transition-colors"
                                    >
                                        <Copy size={14} />
                                    </button>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} className="w-full">
                    Close
                </Button>
            </div>
        </ModalShell>
    );
}
