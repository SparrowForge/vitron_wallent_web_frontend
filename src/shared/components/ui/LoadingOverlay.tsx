"use client";

import Spinner from "./Spinner";

type LoadingOverlayProps = {
    loading: boolean;
    fullScreen?: boolean;
};

export default function LoadingOverlay({
    loading,
    fullScreen = false,
}: LoadingOverlayProps) {
    if (!loading) return null;

    return (
        <div
            className={`
        ${fullScreen ? "fixed" : "absolute"} 
        inset-0 z-50 flex items-center justify-center 
        bg-black/20 backdrop-blur-[1px] transition-all duration-200
      `}
        >
            <div className="rounded-2xl bg-(--background) p-4 shadow-xl border border-(--stroke)">
                <Spinner size={32} className="text-(--brand)" />
            </div>
        </div>
    );
}
