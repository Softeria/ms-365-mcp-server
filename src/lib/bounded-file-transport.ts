import fs from 'fs';
import path from 'path';
import winston from 'winston';
import type TransportStream from 'winston-transport';

// winston exports the transport base class as `Transport` at runtime; its typings
// only declare the lower-case `transport` type, hence the cast.
const Transport = (winston as unknown as { Transport: typeof TransportStream }).Transport;

/**
 * A log file that cannot grow beyond `maxFiles` × `maxBytes`, whatever happens.
 *
 * Each line is appended as it is logged. A line longer than `maxBytes` is cut
 * to fit, with a note of how much was dropped. When the file would exceed
 * `maxBytes` it is renamed to `<name>.1`, `.1` to `.2` and so on, and anything
 * beyond `maxFiles` is removed. If the rename fails, the live file is
 * truncated instead; if that fails too, the transport stops writing and says
 * so once, rather than growing the file. So at most `maxFiles` × `maxBytes`
 * of history is kept per log, oldest dropped. Size-based, not age-based.
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

const MIN_BYTES = 1024;

export class BoundedFileTransport extends Transport {
  readonly filename: string;
  readonly maxBytes: number;
  readonly maxFiles: number;
  private readonly mode: number;
  private size: number;
  private stopped = false;

  constructor(opts: BoundedFileOptions) {
    super(opts);
    this.filename = opts.filename;
    this.maxBytes = Math.max(MIN_BYTES, opts.maxBytes);
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

  /**
   * `<name>.<maxFiles-1>` is removed, every older file shifts up, the live file
   * becomes `.1`. Returns false when the live file could neither be moved aside
   * nor cut to zero.
   */
  private rotate(): boolean {
    try {
      fs.rmSync(this.rotated(this.maxFiles - 1), { force: true });
      for (let n = this.maxFiles - 2; n >= 1; n--) {
        if (fs.existsSync(this.rotated(n))) fs.renameSync(this.rotated(n), this.rotated(n + 1));
      }
    } catch {
      // Older files failing to shift does not change the live file's bound.
    }
    try {
      if (this.maxFiles > 1 && fs.existsSync(this.filename)) {
        fs.renameSync(this.filename, this.rotated(1));
      } else {
        fs.rmSync(this.filename, { force: true });
      }
    } catch {
      // The live file could not be moved: cut it to zero so the bound holds.
      try {
        fs.truncateSync(this.filename, 0);
      } catch {
        this.size = this.currentSize();
        return false;
      }
    }
    this.size = this.currentSize();
    return true;
  }

  /** A single record never exceeds the file bound; the excess is replaced by a note. */
  private fit(line: string): string {
    const bytes = Buffer.byteLength(line);
    if (bytes <= this.maxBytes) return line;
    const note = ` …[${bytes - this.maxBytes} bytes dropped]\n`;
    const room = Math.max(0, this.maxBytes - Buffer.byteLength(note));
    const head = Buffer.from(line).subarray(0, room).toString('utf8').replace(/�+$/, '');
    return `${head}${note}`;
  }

  log(info: Record<string | symbol, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    if (this.stopped) {
      callback();
      return;
    }
    const line = this.fit(`${String(info[Symbol.for('message')] ?? '')}\n`);
    const bytes = Buffer.byteLength(line);
    if (this.size + bytes > this.maxBytes && !this.rotate()) {
      // Neither rotation nor truncation is possible: stop rather than grow.
      this.stopped = true;
      this.emit(
        'error',
        new Error(`log file ${path.basename(this.filename)} cannot be bounded; writing stopped`)
      );
      callback();
      return;
    }
    if (this.size + bytes > this.maxBytes) {
      // The file is still too full for this line after a rotation: give up on it.
      this.stopped = true;
      callback();
      return;
    }
    try {
      fs.appendFileSync(this.filename, line, { mode: this.mode, flag: 'a' });
      this.size += bytes;
    } catch {
      // A full or read-only disk must not take the server down with it.
    }
    callback();
  }
}
