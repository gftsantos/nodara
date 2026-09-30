export type WebGLColor = [number, number, number, number];
export interface WebGLPoint { x: number; y: number; size?: number; color?: WebGLColor }
export interface WebGLSegment { from: { x: number; y: number }; to: { x: number; y: number }; color?: WebGLColor }
export interface WebGLRectangle { x: number; y: number; width: number; height: number; color?: WebGLColor }
const cssColors = new Map<string, WebGLColor>();
let colorContext: CanvasRenderingContext2D | null | undefined;

export function webGLColor(input: string, fallback: WebGLColor = [0.47, 0.52, 1, 1]): WebGLColor {
  const hex = input.trim().replace(/^#/, "");
  if (/^[\da-f]{3,4}$/i.test(hex)) return webGLColor(`#${[...hex].map(character => character.repeat(2)).join("")}`, fallback);
  if (/^[\da-f]{6}([\da-f]{2})?$/i.test(hex)) return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1];
  const rgb = input.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if (rgb) return [Math.min(1, Number(rgb[1]) / 255), Math.min(1, Number(rgb[2]) / 255), Math.min(1, Number(rgb[3]) / 255), rgb[4] === undefined ? 1 : Math.min(1, Number(rgb[4]))];
  const cached = cssColors.get(input); if (cached) return cached;
  if (typeof document !== "undefined") {
    colorContext ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (colorContext) {
      // Let the browser resolve named, HSL and modern CSS colours, just as Canvas2D does.
      colorContext.fillStyle = "#010203"; colorContext.fillStyle = input; const first = colorContext.fillStyle;
      colorContext.fillStyle = "#040506"; colorContext.fillStyle = input;
      if (first === colorContext.fillStyle) {
        colorContext.clearRect(0, 0, 1, 1); colorContext.fillRect(0, 0, 1, 1);
        const pixel = colorContext.getImageData(0, 0, 1, 1).data;
        const resolved: WebGLColor = [pixel[0]! / 255, pixel[1]! / 255, pixel[2]! / 255, pixel[3]! / 255];
        if (cssColors.size >= 256) cssColors.clear(); cssColors.set(input, resolved); return resolved;
      }
    }
  }
  return fallback;
}

const vertexShaderSource = `
attribute vec2 a_position;
attribute float a_size;
attribute vec4 a_color;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
varying vec4 v_color;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size * u_pixelRatio;
  v_color = a_color;
}`;

const fragmentShaderSource = `
precision mediump float;
uniform float u_round;
varying vec4 v_color;
void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  if (u_round > 0.5 && dot(centered, centered) > 0.25) discard;
  gl_FragColor = v_color;
}`;

export interface WebGLRenderer {
  draw(points: WebGLPoint[], width: number, height: number, defaultColor?: WebGLColor, segments?: WebGLSegment[], rectangles?: WebGLRectangle[]): boolean;
  dispose(): void;
}

/** Private retained GPU session: compile once, grow storage only when needed. */
export function createWebGLRenderer(canvas: HTMLCanvasElement, ownsContext = false): WebGLRenderer | null {
  let context: WebGLRenderingContext | WebGL2RenderingContext | null;
  try { context = canvas.getContext("webgl2") ?? canvas.getContext("webgl"); } catch { return null; }
  if (!context) return null;
  const shaders: WebGLShader[] = []; let program: WebGLProgram | null = null; let buffer: WebGLBuffer | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    if (buffer) context.deleteBuffer(buffer);
    if (program) context.deleteProgram(program);
    shaders.splice(0).forEach(shader => context.deleteShader(shader));
    if (ownsContext) { try { if (!context.isContextLost?.()) context.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* Context already unavailable. */ } }
  };
  try {
    for (const [type, source] of [[context.VERTEX_SHADER, vertexShaderSource], [context.FRAGMENT_SHADER, fragmentShaderSource]] as const) {
      const shader = context.createShader(type); if (!shader) throw new Error("Shader allocation failed."); shaders.push(shader);
      context.shaderSource(shader, source); context.compileShader(shader); if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) throw new Error("Shader compilation failed.");
    }
    program = context.createProgram(); if (!program) throw new Error("Program allocation failed.");
    shaders.forEach(shader => context.attachShader(program!, shader)); context.linkProgram(program); if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error("Program link failed.");
    const position = context.getAttribLocation(program, "a_position"); const size = context.getAttribLocation(program, "a_size"); const color = context.getAttribLocation(program, "a_color");
    buffer = context.createBuffer(); if (!buffer || position < 0 || size < 0 || color < 0) throw new Error("Buffer or attributes unavailable.");
    const resolution = context.getUniformLocation(program, "u_resolution");
    const pixelRatio = context.getUniformLocation(program, "u_pixelRatio");
    const round = context.getUniformLocation(program, "u_round");
    shaders.splice(0).forEach(shader => { context.detachShader?.(program!, shader); context.deleteShader(shader); });
    let values = new Float32Array(0);
    return { dispose, draw(points, width, height, defaultColor = [0.47, 0.52, 1, 1], segments = [], rectangles = []) {
    if (disposed || !(width > 0 && height > 0) || context.isContextLost?.()) return false;
    try {
    const required = (rectangles.length * 6 + segments.length * 2 + points.length) * 7;
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    if (required > values.length) {
      const next = new Float32Array(2 ** Math.ceil(Math.log2(Math.max(256, required))));
      context.bufferData(context.ARRAY_BUFFER, next.byteLength, context.DYNAMIC_DRAW);
      if (context.getError && context.getError() !== context.NO_ERROR) throw new Error("GPU allocation failed.");
      values = next;
    }
    let offset = 0;
    const vertex = (point: { x: number; y: number }, size: number, rgba: WebGLColor) => { values[offset++] = point.x; values[offset++] = point.y; values[offset++] = size; for (const channel of rgba) values[offset++] = channel; };
    for (const rect of rectangles) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [0, 1], [1, 0], [1, 1]]) vertex({ x: rect.x + dx! * rect.width, y: rect.y + dy! * rect.height }, 1, rect.color ?? defaultColor);
    for (const segment of segments) { vertex(segment.from, 1, segment.color ?? defaultColor); vertex(segment.to, 1, segment.color ?? defaultColor); }
    for (const point of points) vertex(point, point.size ?? 7, point.color ?? defaultColor);
    context.useProgram(program); context.viewport(0, 0, canvas.width, canvas.height); context.clearColor(0, 0, 0, 0); context.clear(context.COLOR_BUFFER_BIT);
    context.enable(context.BLEND); context.blendFuncSeparate(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA, context.ONE, context.ONE_MINUS_SRC_ALPHA);
    if (required) context.bufferSubData(context.ARRAY_BUFFER, 0, values.subarray(0, required));
    for (const [attribute, components, byteOffset] of [[position, 2, 0], [size, 1, 8], [color, 4, 12]]) { context.enableVertexAttribArray(attribute!); context.vertexAttribPointer(attribute!, components!, context.FLOAT, false, 28, byteOffset!); }
    context.uniform2f(resolution, width, height);
    context.uniform1f(pixelRatio, canvas.width / width);
    context.uniform1f(round, 0);
    if (rectangles.length) context.drawArrays(context.TRIANGLES, 0, rectangles.length * 6);
    if (segments.length) context.drawArrays(context.LINES, rectangles.length * 6, segments.length * 2);
    context.uniform1f(round, 1); context.drawArrays(context.POINTS, rectangles.length * 6 + segments.length * 2, points.length);
    if (context.getError && context.getError() !== context.NO_ERROR) throw new Error("GPU upload or draw failed.");
    return true;
    } catch { dispose(); return false; }
    } };
  } catch { dispose(); return null; }
}

/** Public one-shot compatibility API; retained component sessions use the factory. */
export function renderWebGLPoints(canvas: HTMLCanvasElement, points: WebGLPoint[], width: number, height: number, defaultColor?: WebGLColor, segments?: WebGLSegment[], rectangles?: WebGLRectangle[]): boolean {
  if (!(width > 0 && height > 0)) return false;
  const renderer = createWebGLRenderer(canvas);
  try { return renderer?.draw(points, width, height, defaultColor, segments, rectangles) ?? false; }
  finally { renderer?.dispose(); }
}

/** Owns only the reusable WebGL canvas. Canvas2D gets a fresh drawing state. */
export function createWebGLSurface() {
  let canvas: HTMLCanvasElement | undefined;
  let renderer: WebGLRenderer | null | undefined;
  const dispose = () => { renderer?.dispose(); renderer = undefined; canvas = undefined; };
  return {
    dispose,
    acquire(mode: string, className: string) {
      if (mode !== "webgl") { dispose(); const next = document.createElement("canvas"); next.className = className; return next; }
      if (!canvas) { canvas = document.createElement("canvas"); canvas.className = className; }
      return canvas;
    },
    draw(points: WebGLPoint[], width: number, height: number, defaultColor?: WebGLColor, segments?: WebGLSegment[], rectangles?: WebGLRectangle[]) {
      if (!canvas) return false;
      // Own the context even if factory allocation fails. Public one-shot
      // canvases remain caller-owned and must stay usable after rendering.
      renderer ??= createWebGLRenderer(canvas, true);
      return renderer?.draw(points, width, height, defaultColor, segments, rectangles) ?? false;
    },
  };
}

/** A canvas cannot switch context types after acquiring WebGL. */
export function replaceWebGLCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const replacement = canvas.cloneNode(false) as HTMLCanvasElement;
  replacement.width = canvas.width; replacement.height = canvas.height;
  canvas.replaceWith(replacement);
  return replacement;
}
