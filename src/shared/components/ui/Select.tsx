import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, error, ...props }, ref) => {
        return (
            <div className="relative space-y-2">
                <div className="relative">
                    <select
                        className={cn(
                            "flex h-11 w-full appearance-none rounded-xl border border-(--stroke) bg-(--background) px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-(--placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)/50 focus-visible:border-(--brand) disabled:cursor-not-allowed disabled:opacity-50",
                            error && "border-red-500 focus-visible:ring-red-500",
                            className
                        )}
                        ref={ref}
                        {...props}
                    >
                        {children}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 opacity-50 pointer-events-none" />
                </div>
                {error && <p className="text-xs text-red-500 animate-in slide-in-from-top-1 fade-in-0">{error}</p>}
            </div>
        );
    }
);
Select.displayName = "Select";

export { Select };
