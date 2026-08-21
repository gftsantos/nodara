export interface WebGLPoint {
  x: number;
  y: number;
  size?: number;
  color?: [number, number, number, number];
}

const vertexShaderSource = `
attribute vec2 a_position;
attribute float a_size;
uniform vec2 u_resolution;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size;
}`;

const fragmentShaderSource = `
precision mediump float;
uniform vec4 u_color;
void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  if (dot(centered, centered) > 0.25) discard;
  gl_FragColor = u_color;
}`;

function compileShader(context: WebGLRenderingContext, type: number, source: string): WebGLShader | undefined {
  const shader = context.createShader(type);
  if (!shader) return undefined;
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    context.deleteShader(shader);
    return undefined;
  }
  return shader;
}

export function renderWebGLPoints(
  canvas: HTMLCanvasElement,
  points: WebGLPoint[],
  width: number,
  height: number,
  defaultColor: [number, number, number, number] = [0.47, 0.52, 1, 1],
): boolean {
  const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!context) return false;
  const vertexShader = compileShader(context, context.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return false;
  const program = context.createProgram();
  if (!program) return false;
  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) return false;
  context.useProgram(program);
  context.viewport(0, 0, canvas.width, canvas.height);
  context.clearColor(0, 0, 0, 0);
  context.clear(context.COLOR_BUFFER_BIT);
  const position = context.getAttribLocation(program, "a_position");
  const size = context.getAttribLocation(program, "a_size");
  const resolution = context.getUniformLocation(program, "u_resolution");
  const color = context.getUniformLocation(program, "u_color");
  const positions = new Float32Array(points.flatMap((point) => [point.x, point.y]));
  const sizes = new Float32Array(points.map((point) => point.size ?? 7));
  const positionBuffer = context.createBuffer();
  const sizeBuffer = context.createBuffer();
  if (!positionBuffer || !sizeBuffer || position < 0 || size < 0) return false;
  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.bufferData(context.ARRAY_BUFFER, positions, context.STATIC_DRAW);
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  context.bindBuffer(context.ARRAY_BUFFER, sizeBuffer);
  context.bufferData(context.ARRAY_BUFFER, sizes, context.STATIC_DRAW);
  context.enableVertexAttribArray(size);
  context.vertexAttribPointer(size, 1, context.FLOAT, false, 0, 0);
  context.uniform2f(resolution, width, height);
  context.uniform4fv(color, defaultColor);
  context.drawArrays(context.POINTS, 0, points.length);
  context.deleteBuffer(positionBuffer);
  context.deleteBuffer(sizeBuffer);
  context.deleteProgram(program);
  context.deleteShader(vertexShader);
  context.deleteShader(fragmentShader);
  return true;
}
