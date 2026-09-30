import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, hardenResponse, rejectedRequest, rejectionResponse, securityHeaders } from "../../../security/request-policy";
import { parsePortalJSON, PORTAL_JSON_LIMIT } from "../../../app/safe-json";

describe("private portal request policy", () => {
  it("preserves framework routing metadata while adding headers", () => {
    const response = new Response(null), signal = Symbol("framework-routing");
    Object.defineProperty(response, signal, { value: "/downloads/manifest.json" });
    const secured = hardenResponse(response, new Request("https://site.test/"));
    expect(secured).toBe(response);
    expect(Reflect.get(secured, signal)).toBe("/downloads/manifest.json");
    expect(secured.headers.get("x-frame-options")).toBe("DENY");
  });
  it("supports immutable native redirect headers without losing the destination", () => {
    const secured = hardenResponse(Response.redirect("https://site.test/docs"), new Request("https://site.test/"));
    expect(secured.status).toBe(302);
    expect(secured.headers.get("location")).toBe("https://site.test/docs");
    expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it.each(["/.env", "/.git/config", "/%252eenv", "/.wrangler/logs/error.log", "/assets/index.js.map", "/outputs/report.json", "/packages/core/src/index.ts", "/@fs/C:/secret", "/__debug", "/package-lock.json", "/_vinext/image?url=http://169.254.169.254/", "/_next/image?url=https://example.com/"])("rejects internal/unused surface %s", path => {
    expect(rejectedRequest(new Request(`https://site.test${path}`))?.status).toBe(404);
  });
  it.each(["/", "/docs", "/catalog", "/operations", "/legal", "/_next/static/a.js", "/favicon.svg", "/downloads/nodara-core-0.1.0-beta.1.tgz"])("allows read %s", path => {
    expect(rejectedRequest(new Request(`https://site.test${path}`))).toBeUndefined();
  });
  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("has no application mutation surface: %s", method => {
    const request = new Request("https://site.test/", { method });
    const result = rejectionResponse(request, rejectedRequest(request)!);
    expect(result.status).toBe(405);
    expect(result.headers.get("allow")).toBe("GET, HEAD");
    expect(result.headers.has("access-control-allow-origin")).toBe(false);
  });
  it.each(["/%ZZ", "/%255csecret", "/%00secret", "/%252525252eenv"])("rejects malformed/ambiguous path %s", path => {
    expect(rejectedRequest(new Request(`https://site.test${path}`))?.status).toBe(400);
  });
  it("uses a nonce without unsafe script execution in production", () => {
    const csp = contentSecurityPolicy("a-new-nonce");
    expect(csp).toContain("'nonce-a-new-nonce' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp.split(";").find(value => value.trim().startsWith("script-src "))).not.toContain("unsafe-inline");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
  });
  it("hardens responses without inventing CORS or applying HSTS to local HTTP", () => {
    const headers = new Headers({ "X-Powered-By": "server" });
    securityHeaders(headers, new Request("http://localhost/"));
    expect(headers.has("strict-transport-security")).toBe(false);
    expect(headers.has("x-powered-by")).toBe(false);
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    securityHeaders(headers, new Request("https://site.test/"));
    expect(headers.get("strict-transport-security")).toBe("max-age=31536000");
  });
});

describe("untrusted editor JSON budgets", () => {
  it("accepts ordinary data and treats HTML as text", () => {
    expect(parsePortalJSON('{"label":"<script>alert(1)</script>"}')).toEqual({ label: "<script>alert(1)</script>" });
  });
  it.each(["__proto__", "constructor", "prototype"])("rejects reserved key %s", key => {
    expect(() => parsePortalJSON(`{"meta":{"${key}":{"polluted":true}}}`)).toThrow("reservada");
    expect({}).not.toHaveProperty("polluted");
  });
  it("bounds size before parsing", () => { expect(() => parsePortalJSON(" ".repeat(PORTAL_JSON_LIMIT + 1))).toThrow("milhões"); });
  it("bounds depth without recursive traversal", () => { expect(() => parsePortalJSON("[".repeat(66) + "0" + "]".repeat(66))).toThrow("complexo"); });
  it("bounds total values", () => { expect(() => parsePortalJSON(JSON.stringify(Array(100_001).fill(0)))).toThrow("complexo"); });
  it("rejects invalid JSON without executing it", () => { expect(() => parsePortalJSON("alert(1)" )).toThrow(); });
});
