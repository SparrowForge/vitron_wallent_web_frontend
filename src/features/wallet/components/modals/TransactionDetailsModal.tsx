"use client";

import { Button } from "@/shared/components/ui/Button";
import ModalShell from "@/shared/components/ui/ModalShell";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";

type TransactionDetailsModalProps = {
    transaction: any | null;
    onClose: () => void;
};

export default function TransactionDetailsModal({
    transaction,
    onClose,
}: TransactionDetailsModalProps) {
    if (!transaction) return null;

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!", { className: "!bg-(--background) !text-(--foreground) border border-(--stroke)" });
    };

    const fields = [
        { label: "Order ID", value: transaction.orderFull, copyable: true },
        { label: "Type", value: transaction.typeString || transaction.type },
        { label: "Amount", value: transaction.amount },
        { label: "Date", value: transaction.date },
        { label: "Trade ID", value: transaction.tradeId, copyable: true },
    ];

    return (
        <ModalShell
            open={!!transaction}
            onClose={onClose}
            ariaLabel="Transaction Details"
            className="max-w-md relative overflow-hidden"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-(--foreground)">Transaction Details</h3>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
                    ✕
                </Button>
            </div>

            <div className="space-y-6 py-2">
                <div className="flex flex-col items-center justify-center gap-2 pb-6 border-b border-(--stroke)">
                    <span className="text-3xl font-bold text-(--foreground)">
                        {transaction.amount}
                    </span>
                    <span className="text-sm text-(--paragraph)">
                        {transaction.typeString || transaction.type}
                    </span>
                </div>

                <div className="space-y-4">
                    {fields.map((field) => (
                        <div
                            key={field.label}
                            className="flex items-center justify-between text-sm"
                        >
                            <span className="text-(--paragraph)">{field.label}</span>
                            <span className="font-medium text-(--foreground) flex items-center gap-2">
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
