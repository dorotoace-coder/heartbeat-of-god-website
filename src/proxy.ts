import { NextRequest, NextResponse } from "next/server";

const message = "Pulse OS is temporarily closed while we prepare the department workspaces.";

export function proxy(request: NextRequest) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message }, { status: 503, headers });
  }

  return new NextResponse(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pulse OS | Heartbeat of God</title><style>body{background:#faf8fc;color:#291342;font:1.1rem/1.6 system-ui;margin:0;padding:8vh 6vw}main{max-width:38rem;margin:auto}a{color:inherit}</style><main><h1>Staff workspace temporarily closed</h1><p>${message}</p><a href="/">Return to the ministry website</a></main></html>`,
    { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const config = { matcher: ["/admin/:path*", "/login", "/api/pulse"] };
