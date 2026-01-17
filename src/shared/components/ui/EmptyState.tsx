import { cn } from "@/lib/utils";
import * as React from "react";

const EmptyState = ({
    message,
    className,
}: {
    message: string;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 text-center text-(--paragraph)",
                className
            )}
        >
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-(--basic-cta) border border-(--stroke)">
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-(--icon-color)"
                >
                    <path d="M12 2v4" />
                    <path d="m16.2 7.8 2.9-2.9" />
                    <path d="M18 12h4" />
                    <path d="m16.2 16.2 2.9 2.9" />
                    <path d="M12 18v4" />
                    <path d="m4.9 19.1 2.9-2.9" />
                    <path d="M2 12h4" />
                    <path d="m4.9 4.9 2.9 2.9" />
                </svg>
            </div>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
};

export default EmptyState;
