import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// Protect the dashboard UIs, their write APIs, and the unpublished-draft
// previews the review screen renders in an iframe.
const PROTECTED_PAGES = ["/admin", "/seoteam", "/preview"];
const PROTECTED_APIS = ["/api/admin", "/api/seoteam"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.SESSION_SECRET ?? "";

  const isPage = PROTECTED_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isApi = PROTECTED_APIS.some((p) => pathname.startsWith(p));
  if (!isPage && !isApi) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySession(token, secret);
  if (authed) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect unauthenticated page requests to login, preserving destination.
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/seoteam/:path*",
    "/preview/:path*",
    "/api/admin/:path*",
    "/api/seoteam/:path*",
  ],
};
