/** Portal policy, not an authentication provider or a distributed rate limiter. */
export function rejectedRequest(request: Request): { status: number; message: string } | undefined {
  const url = new URL(request.url);
  let path = url.pathname;
  try {
    for (let i = 0; i < 4; i++) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
  } catch { return { status: 400, message: "Invalid path" }; }
  if (path.includes("%") || path.includes("\\") || [...path].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return { status: 400, message: "Invalid path" };
  if (path.split("/").some(segment => segment.startsWith(".")) ||
      /\.(?:map|log|sqlite|db|pem|key|toml|ya?ml)$/i.test(path) ||
      /^\/(?:__debug|@fs|@vite|src|packages|node_modules|outputs|work|worker|security)(?:\/|$)/i.test(path) ||
      /^\/(?:package(?:-lock)?\.json|tsconfig\.json|vite\.config\.[^/]+|SECURITY\.md)$/i.test(path) ||
      /^\/(?:_vinext|_next)\/image\/?$/i.test(path)) return { status: 404, message: "Not found" };
  // This portal has no writes, uploads, server actions, webhooks or checkout.
  // Authentication endpoints are handled by the hosting gateway, before the app.
  if (request.method !== "GET" && request.method !== "HEAD") return { status: 405, message: "Method not allowed" };
}

export function contentSecurityPolicy(nonce: string, development = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'", // Visualization geometry uses style properties.
    "img-src 'self' data: blob:", "font-src 'self'", "media-src 'none'",
    `connect-src 'self'${development ? " ws://127.0.0.1:* ws://localhost:*" : ""}`,
    "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(headers: Headers, request: Request): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.delete("X-Powered-By");
  if (new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000");
}

export function rejectionResponse(request: Request, rejection: { status: number; message: string }): Response {
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  if (rejection.status === 405) headers.set("Allow", "GET, HEAD");
  securityHeaders(headers, request);
  return new Response(request.method === "HEAD" ? null : rejection.message, { status: rejection.status, headers });
}

export function hardenResponse(response: Response, request: Request): Response {
  // Preserve framework-owned response metadata (static-file routing signals and
  // streaming markers). Reconstructing every Response loses those signals.
  try {
    securityHeaders(response.headers, request);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    // Native fetch/redirect responses can have immutable headers. They are real
    // HTTP responses, not mutable framework routing sentinels.
    const mutable = new Response(response.body, response);
    securityHeaders(mutable.headers, request);
    return mutable;
  }
}
