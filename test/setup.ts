// Node 18 lacks the Web `File` global that Node 20+ and browsers provide.
// The generated Graph client uses `z.instanceof(File)` for multipart upload
// endpoints, so importing it under Node 18 throws ReferenceError at module load.
// Provide a minimal stand-in so tests that load the real client can run on 18.
if (typeof (globalThis as { File?: unknown }).File === 'undefined') {
  (globalThis as { File?: unknown }).File = class File {};
}
