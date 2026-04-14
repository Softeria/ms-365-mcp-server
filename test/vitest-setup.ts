/**
 * pdf-parse pulls in pdfjs-dist, which references browser canvas globals at import time.
 * Vitest runs in Node without these unless we define minimal stubs.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- test env shims */
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    constructor(_init?: string | number[]) {}
  };
}
if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    constructor(..._args: unknown[]) {}
  };
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    constructor(_path?: unknown) {}
  };
}
