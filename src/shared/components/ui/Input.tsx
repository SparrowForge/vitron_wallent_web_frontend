import { cn } from "@/lib/utils";
import * as React from "react";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    startIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, startIcon, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                <div className="relative group">
                    {startIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-(--paragraph) transition-colors group-focus-within:text-(--brand)">
                            {startIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 py-2 text-sm text-(--foreground) ring-offset-(--background) file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-(--placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                            startIcon && "pl-10",
                            error && "border-red-500 focus-visible:ring-red-500",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-500 animate-in slide-in-from-top-1 fade-in-0">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
