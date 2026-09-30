import { describe, expect, it, vi } from "vitest";
import { createWebGLRenderer } from "../src/webgl";
import { createChart } from "../src/chart";
import { createGantt } from "../src/gantt";
import { resolveRenderMode } from "../src/render-mode";
import { createCanvas2DContext } from "./setup";

function gpu() {
  const gl = {
    ARRAY_BUFFER: 1, DYNAMIC_DRAW: 2, FLOAT: 3, VERTEX_SHADER: 4, FRAGMENT_SHADER: 5, COMPILE_STATUS: 6, LINK_STATUS: 7, COLOR_BUFFER_BIT: 8, POINTS: 9,
    enable: vi.fn(), blendFuncSeparate: vi.fn(), uniform1f: vi.fn(), attachShader: vi.fn(), detachShader: vi.fn(), bindBuffer: vi.fn(), bufferData: vi.fn(), bufferSubData: vi.fn(), clear: vi.fn(), clearColor: vi.fn(), compileShader: vi.fn(),
    createBuffer: vi.fn(() => ({})), createProgram: vi.fn(() => ({})), createShader: vi.fn(() => ({})), deleteBuffer: vi.fn(), deleteProgram: vi.fn(), deleteShader: vi.fn(), drawArrays: vi.fn(), enableVertexAttribArray: vi.fn(),
    getAttribLocation: vi.fn((_p, name) => name === "a_position" ? 0 : name === "a_size" ? 1 : 2), getProgramParameter: vi.fn(() => true), getShaderParameter: vi.fn(() => true), getUniformLocation: vi.fn(() => ({})), linkProgram: vi.fn(), shaderSource: vi.fn(), uniform2f: vi.fn(), useProgram: vi.fn(), vertexAttribPointer: vi.fn(), viewport: vi.fn(), isContextLost: vi.fn(() => false),
  };
  const context2d = createCanvas2DContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => type.startsWith("webgl") ? gl : context2d) as typeof HTMLCanvasElement.prototype.getContext);
  return gl;
}
describe("retained GPU resources", () => {
  it("releases owned contexts after failed initialization but never caller-owned contexts", () => {
    const loseContext = vi.fn(); const gl = Object.assign(gpu(), { getExtension: vi.fn(() => ({ loseContext })) }); gl.getShaderParameter.mockReturnValue(false);
    expect(createWebGLRenderer(document.createElement("canvas"), true)).toBeNull(); expect(loseContext).toHaveBeenCalledTimes(1);
    expect(createWebGLRenderer(document.createElement("canvas"))).toBeNull(); expect(loseContext).toHaveBeenCalledTimes(1);
  });
  it("does not probe GPU for explicit DOM/Canvas or small automatic datasets", () => {
    const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    for (const mode of ["canvas", "dom", "auto"] as const) expect(resolveRenderMode(mode, 1)).not.toBe("webgl");
    expect(context).not.toHaveBeenCalled();
  });
  it("reuses programs, buffers and storage, grows only when necessary and releases once", () => {
    const gl = gpu(); const canvas = document.createElement("canvas");
    const session = createWebGLRenderer(canvas)!;
    for (let i = 0; i < 10; i++) expect(session.draw([{ x: i, y: 2 }], 100, 100)).toBe(true);
    expect(gl.createShader).toHaveBeenCalledTimes(2); expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.createProgram).toHaveBeenCalledTimes(1); expect(gl.createBuffer).toHaveBeenCalledTimes(1);
    expect(gl.getUniformLocation).toHaveBeenCalledTimes(3); expect(gl.bufferData).toHaveBeenCalledTimes(1); expect(gl.bufferSubData).toHaveBeenCalledTimes(10);
    expect(gl.deleteProgram).not.toHaveBeenCalled(); expect(gl.deleteBuffer).not.toHaveBeenCalled();
    expect(session.draw(Array.from({ length: 100 }, (_, x) => ({ x, y: 1 })), 100, 100)).toBe(true);
    expect(gl.bufferData).toHaveBeenCalledTimes(2);
    expect(session.draw([], 100, 100)).toBe(true); expect(gl.clear).toHaveBeenCalledTimes(12);
    session.dispose(); session.dispose(); expect(session.draw([], 100, 100)).toBe(false);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1); expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
  });
  it.each(["shader", "program", "buffer", "upload"])("cleans partial resources after %s failure", stage => {
    const gl = gpu();
    if (stage === "shader") gl.getShaderParameter.mockReturnValue(false);
    if (stage === "program") gl.getProgramParameter.mockReturnValue(false);
    if (stage === "buffer") gl.createBuffer.mockReturnValue(null as unknown as object);
    if (stage === "upload") gl.bufferSubData.mockImplementation(() => { throw new Error("GPU allocation"); });
    const session = createWebGLRenderer(document.createElement("canvas"));
    if (stage === "upload") expect(session!.draw([{ x: 0, y: 0 }], 10, 10)).toBe(false); else expect(session).toBeNull();
    session?.dispose();
    expect(gl.deleteShader.mock.calls.length).toBe(gl.createShader.mock.calls.length);
    expect(gl.deleteProgram.mock.calls.length).toBe(gl.createProgram.mock.calls.length);
    expect(gl.deleteBuffer.mock.calls.length).toBe(stage === "buffer" ? 0 : gl.createBuffer.mock.calls.length);
  });
  it.each(["allocation", "upload"])("detects native GPU %s errors without a JavaScript exception", stage => {
    const gl = Object.assign(gpu(), { NO_ERROR: 0, getError: vi.fn(() => 0) });
    if (stage === "allocation") gl.getError.mockReturnValueOnce(1285); else gl.getError.mockReturnValueOnce(0).mockReturnValueOnce(1285);
    const session = createWebGLRenderer(document.createElement("canvas"))!;
    expect(session.draw([{ x: 0, y: 0 }], 10, 10)).toBe(false); expect(session.draw([], 10, 10)).toBe(false); session.dispose();
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1); expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  });
  for (const engine of ["chart", "gantt"] as const) {
    it(`${engine} retains the actual canvas across updates and frees it on mode change/destroy`, () => {
      const gl = gpu(); const root = document.createElement("div"); document.body.append(root);
      const series = [{ id: "a", label: "A", data: [{ x: 0, y: 1 }] }];
      const tasks = [{ id: "a", label: "A", start: 0, end: 100 }];
      const controller = engine === "chart" ? createChart(root, { series, type: "scatter", renderer: "webgl" }) : createGantt(root, { data: tasks, renderer: "webgl" });
      const canvas = root.querySelector("canvas");
      for (let i = 0; i < 10; i++) {
        if (engine === "chart") { series[0]!.data[0]!.y = i + 2; (controller as ReturnType<typeof createChart>).update(series); }
        else { tasks[0]!.end = 101 + i; (controller as ReturnType<typeof createGantt>).update(tasks); }
        expect(root.querySelector("canvas")).toBe(canvas);
      }
      expect(gl.createProgram).toHaveBeenCalledTimes(1); expect(gl.bufferSubData).toHaveBeenCalledTimes(11);
      controller.setOptions({ renderer: "canvas" }); expect(root.querySelector("canvas")).not.toBe(canvas);
      expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
      controller.setOptions({ renderer: "webgl" }); expect(gl.createProgram).toHaveBeenCalledTimes(2);
      controller.destroy(); controller.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(2); expect(root.children.length).toBe(0);
    });
    it(`${engine} releases retained GPU resources after context loss`, () => {
      const gl = gpu(); const root = document.createElement("div"); document.body.append(root);
      const controller = engine === "chart" ? createChart(root, { series: [{ id: "a", label: "A", data: [{ x: 0, y: 1 }] }], type: "scatter", renderer: "webgl" }) : createGantt(root, { data: [{ id: "a", label: "A", start: 0, end: 100 }], renderer: "webgl" });
      const canvas = root.querySelector("canvas")!; canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
      expect(root.dataset.ndRenderer).toBe("canvas"); expect(root.querySelector("canvas")).not.toBe(canvas); expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
      controller.destroy(); expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    });
  }
});
