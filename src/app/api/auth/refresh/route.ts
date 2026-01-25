import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("CryptoPag_refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json({ msg: "No refresh token", code: 401 }, { status: 401 });
    }

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.refreshToken}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                authType: "refreshToken",
                refreshToken: refreshToken,
            }),
        });

        const data = await response.json();

        if (data.code && Number(data.code) !== 200) {
            // Refresh failed
            return NextResponse.json(data);
        }

        if (data.data) {
            const { access_token, refresh_token, token_type } = data.data;

            if (access_token) {
                cookieStore.set("CryptoPag_access_token", access_token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                });
            }

            if (refresh_token) {
                cookieStore.set("CryptoPag_refresh_token", refresh_token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                });
            }

            if (token_type) {
                cookieStore.set("CryptoPag_token_type", token_type.trim(), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                });
            }
        }

        return NextResponse.json({ code: 200, msg: "Refreshed" });

    } catch (error) {
        return NextResponse.json({ msg: "Refresh failed", code: 500 }, { status: 500 });
    }
}
