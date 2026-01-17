import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("vtron_refresh_token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/auth");
  // Protected routes: everything not public. 
  // Public: /, /auth, /api/proxy (handled by next), /_next, /favicon.
  // Actually config matcher handles most.
  // If matcher matches, it's a candidate for protection.

  // Specific public paths in the matcher?
  // The matcher includes /auth.

  if (isAuthPage && token) {
    // If user is logged in and visits /auth, redirect to /wallet
    return NextResponse.redirect(new URL("/wallet", request.url));
  }

  if (!isAuthPage && !token) {
    // If user is NOT logged in and visits protected page
    // (Note: The matcher primarily targets protected pages + auth)
    const protectedPaths = [
      "/dashboard", "/wallet", "/cards", "/transactions",
      "/payments", "/settings", "/contact"
    ];
    const isProtected = protectedPaths.some(p => pathname.startsWith(p));

    if (isProtected) {
      const url = new URL("/auth", request.url);
      // Optional: preserve return url
      // url.searchParams.set("return_to", pathname); 
      return NextResponse.redirect(url);
    }
  }

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
