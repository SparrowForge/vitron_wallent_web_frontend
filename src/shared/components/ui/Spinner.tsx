"use client";

type SpinnerProps = {
  size?: number;
  className?: string;
};

export default function Spinner({ size = 16, className = "" }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-(--stroke) border-t-(--brand) ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
