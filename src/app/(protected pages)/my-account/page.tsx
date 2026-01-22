"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";

import { Button } from "@/shared/components/ui/Button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { User, Shield, Mail, CheckCircle, XCircle, Copy, Check } from "lucide-react";

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="text-(--paragraph) hover:text-(--foreground) transition-colors"
            title="Copy to clipboard"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
};

type MerchantInfo = {
    id: number;
    realName: string;
    email: string;
    googleStatus: string;
    isPayPassword: string | null;
    kycStatus: number;
    kycRemark: string | null;
    headUrl: string;
    emailCheck: boolean;
    distributorStatus: string | null;
};

type MerchantInfoResponse = {
    code?: number | string;
    msg?: string;
    data?: MerchantInfo;
};

export default function MyAccountPage() {
    const [info, setInfo] = useState<MerchantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const response = await apiRequest<MerchantInfoResponse>({
                    path: API_ENDPOINTS.merchantInfo,
                    method: "POST",
                    body: JSON.stringify({}),
                });

                if (Number(response.code) === 200 && response.data) {
                    setInfo(response.data);
                } else {
                    setError(response.msg || "Failed to load account info");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, []);

    const getKycStatusLabel = (status: number) => {
        switch (status) {
            case 0: return "In Review";
            case 1: return "Review Completed";
            case 2: return "Face Verification Required";
            case 3: return "Awaiting Review";
            case 4: return "Rejected";
            case 5: return "Verified";
            case 7: return "Not Submitted";
            default: return "Unverified";
        }
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-cover bg-center">
            <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
                <div className="mx-auto max-w-4xl space-y-6">

                    <h1 className="text-2xl font-bold text-(--foreground)">My Account</h1>

                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-3xl border border-(--stroke) bg-(--card)/30 backdrop-blur-md">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--brand) border-t-transparent"></div>
                        </div>
                    ) : error ? (
                        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-500">
                            {error}
                        </div>
                    ) : info ? (
                        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                            {/* Profile Card */}
                            <div className="rounded-3xl border border-(--stroke) bg-(--card)/30 p-6 backdrop-blur-md flex flex-col items-center text-center">
                                <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-(--brand)">
                                    {info.headUrl ? (
                                        <img src={info.headUrl} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-(--brand)/10 text-(--brand)">
                                            <User className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl font-semibold text-(--foreground)">{info.realName || "User"}</h2>
                                <p className="text-sm text-(--paragraph) flex items-center justify-center gap-2">
                                    ID: {info.id}
                                    <CopyButton text={info.id.toString()} />
                                </p>
                                <div className="mt-4 rounded-full bg-(--brand)/10 px-3 py-1 text-xs font-medium text-(--brand)">
                                    {getKycStatusLabel(info.kycStatus)}
                                </div>
                            </div>

                            {/* Details Card */}
                            <div className="space-y-6">
                                <div className="rounded-3xl border border-(--stroke) bg-(--card)/30 p-6 backdrop-blur-md space-y-6">
                                    <h3 className="text-lg font-semibold text-(--foreground) flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-(--brand)" />
                                        Account Information
                                    </h3>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-(--paragraph)">Email Address</label>
                                            <div className="flex items-center gap-2 text-sm text-(--foreground)">
                                                <Mail className="h-4 w-4 text-(--paragraph)" />
                                                {info.email}
                                                <CopyButton text={info.email} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-(--paragraph)">Google Auth Status</label>
                                            <div className="flex items-center gap-2 text-sm text-(--foreground)">
                                                {Number(info.googleStatus) === 1 ? (
                                                    <div className="flex items-center gap-1.5 text-green-500">
                                                        <CheckCircle className="h-4 w-4" /> Enabled
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 text-amber-500">
                                                            <XCircle className="h-4 w-4" /> Disabled/Unbound
                                                        </div>
                                                        <Link href="/settings/google-auth">
                                                            <Button size="sm" variant="outline" className="h-7 text-xs">
                                                                Enable Now
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-(--paragraph)">Payment Password</label>
                                            <div className="flex items-center gap-2 text-sm text-(--foreground)">
                                                {Number(info.isPayPassword) === 1 ? (
                                                    <div className="flex items-center gap-1.5 text-green-500">
                                                        <CheckCircle className="h-4 w-4" /> Set
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 text-amber-500">
                                                            <XCircle className="h-4 w-4" /> Not Set
                                                        </div>
                                                        <Link href="/settings/transaction-password">
                                                            <Button size="sm" variant="outline" className="h-7 text-xs">
                                                                Enable Now
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-(--paragraph)">KYC Status</label>
                                            <div className="flex items-center gap-2 text-sm text-(--foreground)">
                                                {info.kycStatus === 5 ? (
                                                    <div className="flex items-center gap-1.5 text-green-500">
                                                        <CheckCircle className="h-4 w-4" /> Verified
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className={info.kycStatus === 4 ? "text-red-500" : "text-amber-500"}>
                                                            {getKycStatusLabel(info.kycStatus)}
                                                        </div>
                                                        <Link href="/authentication">
                                                            <Button size="sm" variant="outline" className="h-7 text-xs">
                                                                {info.kycStatus === 7 ? "Submit Now" : "Update Now"}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
