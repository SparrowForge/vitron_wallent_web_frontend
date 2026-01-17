"use client";

import { apiRequest } from "@/lib/api";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { useMemo, useState } from "react";

type ApiResponse = {
  code?: number | string;
  msg?: string;
};

type DiagnosticItem = {
  key: string;
  label: string;
  status: "idle" | "ok" | "fail";
  latency?: number;
  detail?: string;
};

const runTimed = async (fn: () => Promise<void>) => {
  const start = performance.now();
  await fn();
  return Math.round(performance.now() - start);
};

export default function NetworkDiagnosticsPage() {
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<DiagnosticItem[]>([
    { key: "online", label: "Browser online status", status: "idle" },
    { key: "base", label: "API base reachable", status: "idle" },
    { key: "merchant", label: "Merchant info", status: "idle" },
    { key: "wallet", label: "Wallet list", status: "idle" },
  ]);

  const ipLabel = useMemo(() => "--", []);

  const updateItem = (key: string, patch: Partial<DiagnosticItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const runDiagnostics = async () => {
    if (running) {
      return;
    }
    setRunning(true);
    setItems((prev) =>
      prev.map((item) => ({ ...item, status: "idle", detail: "" }))
    );

    updateItem("online", {
      status: navigator.onLine ? "ok" : "fail",
      detail: navigator.onLine ? "Online" : "Offline",
    });

    try {
      const latency = await runTimed(async () => {
        await apiRequest<ApiResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
      });
      updateItem("base", { status: "ok", latency, detail: API_BASE_URL });
    } catch (error) {
      updateItem("base", {
        status: "fail",
        detail: error instanceof Error ? error.message : "Failed",
      });
    }

    try {
      const latency = await runTimed(async () => {
        await apiRequest<ApiResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
      });
      updateItem("merchant", {
        status: "ok",
        latency,
        detail: "Authenticated",
      });
    } catch (error) {
      updateItem("merchant", {
        status: "fail",
        detail: error instanceof Error ? error.message : "Failed",
      });
    }

    try {
      const latency = await runTimed(async () => {
        await apiRequest<ApiResponse>({
          path: API_ENDPOINTS.walletList,
          method: "POST",
          body: JSON.stringify({}),
        });
      });
      updateItem("wallet", {
        status: "ok",
        latency,
        detail: "Wallet list loaded",
      });
    } catch (error) {
      updateItem("wallet", {
        status: "fail",
        detail: error instanceof Error ? error.message : "Failed",
      });
    }

    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Network Diagnostics
        </h1>
        <p className="text-sm text-(--paragraph)">
          Check connectivity to Vtron services.
        </p>
      </header>

      <Card variant="glass">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm"
              >
                <div>
                  <div className="text-sm font-semibold text-(--double-foreground)">
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs text-(--paragraph)">
                    {item.detail || "Pending"}
                  </div>
                </div>
                <div className="text-xs text-(--paragraph)">
                  {item.latency ? `${item.latency} ms` : "--"}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${item.status === "ok"
                    ? "bg-(--brand)/20 text-(--brand)"
                    : item.status === "fail"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-(--stroke) text-(--paragraph)"
                    }`}
                >
                  {item.status === "idle"
                    ? "Idle"
                    : item.status === "ok"
                      ? "OK"
                      : "Failed"}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--paragraph)">
            Device IP: {ipLabel}
          </div>

          <Button
            onClick={runDiagnostics}
            className="w-full"
            disabled={running}
            loading={running}
          >
            Run diagnostics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
