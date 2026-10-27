import fs from 'fs';
import path from 'path';
import winston from 'winston';
import type TransportStream from 'winston-transport';

// winston exports the transport base class as `Transport` at runtime; its typings
// only declare the lower-case `transport` type, hence the cast.
const Transport = (winston as unknown as { Transport: typeof TransportStream }).Transport;

/**
 * A log file that cannot grow without bound. Each line is appended as it is
 * logged; when the file would exceed `maxBytes` it is renamed to `<name>.1`,
 * `.1` to `.2` and so on, and anything beyond `maxFiles` is removed. So at most
 * `maxFiles` × `maxBytes` of history is kept per log, oldest dropped.
 *
 * winston's File transport has a `maxsize` option that does this in theory,
 * but in winston 3.19 it loses lines during rotation (a burst of 100 lines
 * leaves empty files). This transport writes synchronously, which makes it
 * deterministic and keeps the few lines a tool call produces in order; the
 * cost is a few microseconds per line.
 */
export interface BoundedFileOptions extends TransportStream.TransportStreamOptions {
  filename: string;
  maxBytes: number;
  maxFiles: number;
  mode?: number;
}

export class BoundedFileTransport extends Transport {
  readonly filename: string;
  readonly maxBytes: number;
  readonly maxFiles: number;
  private readonly mode: number;
  private size: number;

  constructor(opts: BoundedFileOptions) {
    super(opts);
    this.filename = opts.filename;
    this.maxBytes = Math.max(1024, opts.maxBytes);
    this.maxFiles = Math.max(1, opts.maxFiles);
    this.mode = opts.mode ?? 0o600;
    fs.mkdirSync(path.dirname(this.filename), { recursive: true, mode: 0o700 });
    this.size = this.currentSize();
  }

  private currentSize(): number {
    try {
      return fs.statSync(this.filename).size;
    } catch {
      return 0;
    }
  }

  private rotated(n: number): string {
    return `${this.filename}.${n}`;
  }

  /** `<name>.<maxFiles-1>` is removed, every older file shifts up, the live file becomes `.1`. */
  private rotate(): void {
    try {
      fs.rmSync(this.rotated(this.maxFiles - 1), { force: true });
      for (let n = this.maxFiles - 2; n >= 1; n--) {
        if (fs.existsSync(this.rotated(n))) fs.renameSync(this.rotated(n), this.rotated(n + 1));
      }
      if (this.maxFiles > 1 && fs.existsSync(this.filename)) {
        fs.renameSync(this.filename, this.rotated(1));
      } else {
        fs.rmSync(this.filename, { force: true });
      }
    } catch {
      // Best effort: a failed rename must not stop logging. The next append
      // starts a fresh file if the live one is gone, or keeps appending.
    }
    this.size = this.currentSize();
  }

  log(info: Record<string | symbol, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    const line = `${String(info[Symbol.for('message')] ?? '')}\n`;
    const bytes = Buffer.byteLength(line);
    if (this.size > 0 && this.size + bytes > this.maxBytes) this.rotate();
    try {
      fs.appendFileSync(this.filename, line, { mode: this.mode, flag: 'a' });
      this.size += bytes;
    } catch {
      // A full or read-only disk must not take the server down with it.
    }
    callback();
  }
}
