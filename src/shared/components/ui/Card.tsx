import { cn } from "@/lib/utils";
import * as React from "react";

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { variant?: "solid" | "glass" | "bordered" }
>(({ className, variant = "solid", ...props }, ref) => {
    const variantStyles = {
        solid: "bg-(--basic-cta) border border-(--stroke)",
        glass:
            "bg-(--basic-cta)/60 backdrop-blur-xl border border-(--white)/5 shadow-xl",
        bordered: "bg-transparent border border-(--stroke)",
    };

    return (
        <div
            ref={ref}
            className={cn(
                "rounded-2xl p-1 text-(--foreground) transition-all duration-300 hover:shadow-2xl",
                variantStyles[variant],
                className
            )}
            {...props}
        />
    );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-(--paragraph)", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { icon?: React.ElementType }
>(({ className, icon: Icon, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center justify-between", className)}
        {...props}
    >
        {children}
        {Icon && (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-(--brand)/10 text-(--brand)">
                <Icon className="h-5 w-5" />
            </div>
        )}
    </div>
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
