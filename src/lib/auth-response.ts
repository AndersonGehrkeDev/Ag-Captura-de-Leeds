import type { NextResponse } from "next/server";

export function preventSharedCache(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  const vary = response.headers.get("Vary");
  response.headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie");
  return response;
}
