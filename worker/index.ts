/** Private read-only portal. Access control remains at the Sites gateway. */
import handler from "vinext/server/app-router-entry";
import { hardenResponse, rejectedRequest, rejectionResponse } from "../security/request-policy";

interface Env {
  ASSETS: Fetcher;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const rejection = rejectedRequest(request);
    if (rejection) return rejectionResponse(request, rejection);
    return hardenResponse(await handler.fetch(request, env, ctx), request);
  },
};

export default worker;
