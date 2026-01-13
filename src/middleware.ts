import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/wallet/:path*",
    "/cards/:path*",
    "/transactions/:path*",
    "/payments/:path*",
    "/settings/:path*",
    "/contact/:path*",
    "/auth",
  ],
};
