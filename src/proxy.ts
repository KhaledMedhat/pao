import { NextRequest, NextResponse } from "next/server";

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;

    const normalizedPayload = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const payloadJson = atob(paddedPayload);
    return JSON.parse(payloadJson) as { exp?: number };
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
};

export function proxy(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const hasValidToken = !!token && !isTokenExpired(token);

  // Check if the user is accessing protected routes (using startsWith for dynamic routes)
  const isChannelRoute = req.nextUrl.pathname.startsWith("/channels");
  const isDmRoute = req.nextUrl.pathname.startsWith("/dm");
  const isServerRoute = req.nextUrl.pathname.startsWith("/server");
  const isGroupRoute = req.nextUrl.pathname.startsWith("/group");
  const isLoginRoute = req.nextUrl.pathname.startsWith("/login");
  const isRegisterRoute = req.nextUrl.pathname.startsWith("/signup");
  const isProtectedRoute = isChannelRoute || isDmRoute || isServerRoute || isGroupRoute;

  if (hasValidToken && (isLoginRoute || isRegisterRoute)) {
    return NextResponse.redirect(new URL("/channels/@me", req.url));
  }
  // If missing/expired token and trying to access protected routes, redirect to login
  if (!hasValidToken && isProtectedRoute) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    if (token) {
      response.cookies.delete("access_token");
    }
    return response;
  }

  // For all other routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ["/channels/:path*", "/dm/:path*", "/server/:path*", "/group/:path*", "/login", "/signup"],
};
