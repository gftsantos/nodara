// Diagnostic only: preserve original HTTP/stream behavior while exposing errors
// that the upstream production server currently discards in pipeline callbacks.
import http from "node:http";
import stream from "node:stream";
import { syncBuiltinESMExports } from "node:module";
let sequence = 0;
const emit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event === "request") {
    const [request, response] = args; const id = ++sequence;
    response.once("error", error => console.error("[http-response-error]", id, request.url, error));
    response.once("close", () => { if (!response.writableFinished) console.error("[http-incomplete]", id, request.url, "headersSent", response.headersSent, "destroyed", response.destroyed); });
  }
  return Reflect.apply(emit, this, [event, ...args]);
};
const pipeline = stream.pipeline;
stream.pipeline = function (...args) {
  const callback = args.pop();
  return Reflect.apply(pipeline, this, [...args, (error, value) => {
    if (error) console.error("[http-pipeline-error]", error);
    callback(error, value);
  }]);
};
syncBuiltinESMExports();
const { startProdServer } = await import("../node_modules/vinext/dist/server/prod-server.js");
await startProdServer({ port: 3002, host: "127.0.0.1" });
