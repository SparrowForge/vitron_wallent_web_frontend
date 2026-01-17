import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-(--background) transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                default:
                    "bg-(--brand) text-(--brand-10) hover:bg-(--brand)/90 shadow-lg shadow-(--brand)/20",
                destructive:
                    "bg-red-500 text-(--white) hover:bg-red-500/90 shadow-lg shadow-red-500/20",
                outline:
                    "border border-(--stroke) bg-(--basic-cta)/50 text-(--foreground) hover:bg-(--basic-cta) hover:text-(--white) hover:border-(--foreground)/20",
                secondary:
                    "bg-(--basic-cta) text-(--foreground) hover:bg-(--basic-cta)/80 hover:text-(--white)",
                ghost: "hover:bg-(--basic-cta) hover:text-(--foreground)",
                link: "text-(--brand) underline-offset-4 hover:underline",
            },
            size: {
                default: "h-11 px-5 py-2",
                sm: "h-9 rounded-lg px-3",
                lg: "h-12 rounded-xl px-8 text-base",
                icon: "h-11 w-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={loading || props.disabled}
                {...props}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
