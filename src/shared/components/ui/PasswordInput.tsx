"use client";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  inputClassName?: string;
  error?: string;
}

export default function PasswordInput({
  className,
  inputClassName,
  disabled,
  error,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <div className="w-full space-y-2">
      <div className={cn("relative", className)}>
        <input
          {...props}
          disabled={disabled}
          type={visible ? "text" : "password"}
          className={cn(
            "flex h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 py-2 text-sm text-(--foreground) ring-offset-(--background) file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-(--placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            "pr-10",
            error && "border-red-500 focus-visible:ring-red-500",
            inputClassName
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={toggleLabel}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-(--icon-color) transition hover:text-(--double-foreground) disabled:opacity-60"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 animate-in slide-in-from-top-1 fade-in-0">{error}</p>}
    </div>
  );
}
