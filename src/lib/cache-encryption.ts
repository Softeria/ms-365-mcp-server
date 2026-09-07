import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const ALGORITHM_LABEL = 'A256GCM';
const ENVELOPE_VERSION = 2;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export const CACHE_KEY_BYTES = 32;

/**
 * The auth cache at rest, encrypted. Only the 32-byte key goes to the keychain, which
 * is what makes this work on Windows: a Credential Manager blob caps out at 2560 bytes
 * and a real token cache is several times that, so the cache itself could never be
 * stored there (issue #602). A key is 32 bytes no matter how many accounts.
 *
 * The v1 envelope (`wrapCache`, plaintext `data` plus `savedAt`) is what gets encrypted,
 * so `savedAt` travels inside the ciphertext and is covered by the GCM tag. Callers see
 * the same v1 string they always did.
 *
 * Both cache files share one key, so each is bound to its purpose through the GCM
 * additional data. Without that, the files are interchangeable ciphertext: one could be
 * copied over the other and still authenticate. The version and algorithm are bound too,
 * as constants rather than as read from the envelope - that separates a v2 ciphertext
 * from whatever a later version writes, but it is the explicit checks in `decryptCache`,
 * not the tag, that catch an edited header on this envelope.
 *
 * Not defended against: replacing a file with an older, still-valid encryption of itself.
 * Detecting that needs a counter outside the file, and the payoff is replaying a refresh
 * token that was already on the same disk.
 */
interface EncryptedEnvelope {
  _cacheEnvelope: true;
  v: number;
  alg: string;
  iv: string;
  tag: string;
  data: string;
}

export function generateCacheKey(): Buffer {
  return randomBytes(CACHE_KEY_BYTES);
}

export function parseCacheKey(encoded: string): Buffer {
  const key = Buffer.from(encoded.trim(), 'base64');
  if (key.length !== CACHE_KEY_BYTES) {
    throw new Error(`Auth cache key must be ${CACHE_KEY_BYTES} bytes, got ${key.length}`);
  }
  return key;
}

export function encodeCacheKey(key: Buffer): string {
  return key.toString('base64');
}

/**
 * Ties a ciphertext to what it is, so the two cache files cannot be swapped for each
 * other and the unauthenticated header cannot be edited.
 */
function additionalData(purpose: string): Buffer {
  return Buffer.from(`ms365:v${ENVELOPE_VERSION}:${ALGORITHM_LABEL}:${purpose}`, 'utf8');
}

export function encryptCache(plaintext: string, key: Buffer, purpose: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(additionalData(purpose));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    _cacheEnvelope: true,
    v: ENVELOPE_VERSION,
    alg: ALGORITHM_LABEL,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: ciphertext.toString('base64'),
  };
  return JSON.stringify(envelope);
}

/**
 * Whether `raw` needs a key before it means anything.
 *
 * Keyed off a numeric `v`, which only the encrypted envelope carries - not off the
 * version being one we understand. A downgrade meeting a newer envelope has to see
 * ciphertext it cannot read, because the v1 plaintext envelope shares the
 * `_cacheEnvelope` discriminator: answering false here would hand base64 ciphertext
 * to MSAL as if it were the cache body.
 */
export function isEncryptedCache(raw: string): boolean {
  return readEnvelope(raw) !== undefined;
}

/**
 * Throws on a wrong key, a truncated envelope, a ciphertext written for a different
 * purpose, or any tampering the GCM tag catches.
 */
export function decryptCache(raw: string, key: Buffer, purpose: string): string {
  const envelope = readEnvelope(raw);
  if (!envelope) {
    throw new Error('Auth cache is not an encrypted envelope');
  }
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported auth cache envelope version: ${envelope.v}`);
  }
  if (envelope.alg !== ALGORITHM_LABEL) {
    throw new Error(`Unsupported auth cache algorithm: ${envelope.alg}`);
  }
  if (
    typeof envelope.iv !== 'string' ||
    typeof envelope.tag !== 'string' ||
    typeof envelope.data !== 'string'
  ) {
    throw new Error('Auth cache envelope is missing iv, tag or data');
  }

  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Auth cache envelope has a malformed iv or tag');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(additionalData(purpose));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Structural only: a `_cacheEnvelope` carrying a numeric `v`. Whether the version and
 * the fields are ones we can actually use is {@link decryptCache}'s call, so that an
 * envelope we cannot read fails loudly instead of being mistaken for plaintext.
 */
function readEnvelope(raw: string): Partial<EncryptedEnvelope> | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') return undefined;

  const candidate = parsed as Partial<EncryptedEnvelope>;
  if (candidate._cacheEnvelope !== true || typeof candidate.v !== 'number') return undefined;
  return candidate;
}
