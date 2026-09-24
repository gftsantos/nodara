import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, rejectedRequest, rejectionResponse, securityHeaders } from "./security/request-policy";

// Request-header overrides are needed only for HTML/RSC nonce propagation.
// Let the static asset handler stream downloads/fonts without middleware bodies.
// The Worker still applies the request policy before both routing and assets.
export const config = { matcher: ["/", "/catalog/:path*", "/docs/:path*", "/operations/:path*", "/legal/:path*"] };

export function middleware(request: NextRequest) {
  const development = process.env.NODE_ENV === "development";
  // Vite's development endpoints are deliberately local-only. Production denies them.
  const rejection = development ? undefined : rejectedRequest(request);
  if (rejection) return rejectionResponse(request, rejection);
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const csp = contentSecurityPolicy(nonce, development);
  const requestHeaders = new Headers(request.headers);
  // Never accept a nonce/CSP supplied by the client.
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  securityHeaders(response.headers, request);
  return response;
}
