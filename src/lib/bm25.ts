/**
 * Tokenizes text for search indexing: splits on whitespace, hyphens, underscores,
 * camelCase boundaries, and common punctuation in tool paths. Lowercases everything.
 * Splitting on these boundaries means "send-mail" indexes as ["send", "mail"] and
 * matches a query like "send email" via the shared "send" token.
 */
export function tokenize(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s\-_/.,;:(){}[\]'"!?@#$]+/)
    .filter((t) => t.length > 0);
}

export interface BM25Doc {
  id: string;
  length: number;
  termFreq: Map<string, number>;
}

export interface BM25Index {
  docs: Map<string, BM25Doc>;
  idf: Map<string, number>;
  avgdl: number;
  k1: number;
  b: number;
}

/**
 * Builds a BM25 index from a set of pre-tokenized documents.
 * Defaults k1=1.2, b=0.75 — standard values that work well for short technical text.
 */
export function buildBM25Index(
  documents: Array<{ id: string; tokens: string[] }>,
  k1 = 1.2,
  b = 0.75
): BM25Index {
  const docs = new Map<string, BM25Doc>();
  const df = new Map<string, number>();
  let totalLen = 0;

  for (const { id, tokens } of documents) {
    const termFreq = new Map<string, number>();
    for (const tok of tokens) {
      termFreq.set(tok, (termFreq.get(tok) ?? 0) + 1);
    }
    for (const tok of termFreq.keys()) {
      df.set(tok, (df.get(tok) ?? 0) + 1);
    }
    docs.set(id, { id, length: tokens.length, termFreq });
    totalLen += tokens.length;
  }

  const N = docs.size;
  const avgdl = N > 0 ? totalLen / N : 0;
  const idf = new Map<string, number>();
  for (const [term, n] of df) {
    idf.set(term, Math.log((N - n + 0.5) / (n + 0.5) + 1));
  }

  return { docs, idf, avgdl, k1, b };
}

/**
 * Scores every document against the query tokens and returns matches sorted by score.
 * Documents that share no tokens with the query are excluded — a query of "xyz" against
 * a tool catalog must return empty rather than an arbitrary top-N.
 */
export function scoreQuery(query: string, index: BM25Index): Array<{ id: string; score: number }> {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return [];

  const results: Array<{ id: string; score: number }> = [];
  for (const [id, doc] of index.docs) {
    let score = 0;
    let matched = false;
    for (const qt of queryTokens) {
      const tf = doc.termFreq.get(qt);
      if (!tf) continue;
      matched = true;
      const idf = index.idf.get(qt) ?? 0;
      const num = tf * (index.k1 + 1);
      const den = tf + index.k1 * (1 - index.b + (index.b * doc.length) / (index.avgdl || 1));
      score += idf * (num / den);
    }
    if (matched) results.push({ id, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
