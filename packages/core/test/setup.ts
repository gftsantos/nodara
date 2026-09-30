import { afterEach, vi } from "vitest";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", { value: TestResizeObserver, configurable: true });
Object.defineProperty(globalThis, "devicePixelRatio", { value: 1, configurable: true });
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });

export function createCanvas2DContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    bezierCurveTo: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    roundRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn(),
    fillStyle: "",
    font: "",
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
    textAlign: "start",
    textBaseline: "alphabetic",
  };
}

const defaultContext = createCanvas2DContext();
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value(type: string) {
    if (type === "2d") return defaultContext;
    return null;
  },
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
