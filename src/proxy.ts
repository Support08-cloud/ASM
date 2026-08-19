import { NextRequest, NextResponse } from "next/server";

const COOKIE = "asm_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;
  const isLogin = pathname === "/login";
  const isPublicApi = pathname === "/api/auth/login" || pathname === "/api/health";

  if (!token && !isLogin && !isPublicApi) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
