import { NextResponse } from "next/server";
import { pinyin as hanziPinyin } from "pinyin-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 8000;

/* ── Chinese word segmentation (ICU dictionary-based) ─────────── */

let segmenter: Intl.Segmenter | undefined;
try {
  segmenter = new Intl.Segmenter("zh-Hans", { granularity: "word" });
} catch {
  segmenter = undefined; // very old runtimes only
}

function tokenize(chinese: string): { t: string; w: boolean }[] {
  if (segmenter) {
    return Array.from(segmenter.segment(chinese), (s) => ({
      t: s.segment,
      w: Boolean(s.isWordLike),
    }));
  }
  /* fallback: one entry per CJK character */
  return Array.from(chinese, (ch) => ({
    t: ch,
    w: /[\u4e00-\u9fff]/.test(ch),
  }));
}

/* ── Offline pinyin (pinyin-pro) — no network required ────────── */

function localPinyin(text: string): string | null {
  try {
    const out = hanziPinyin(text, { toneType: "symbol" }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

interface Token {
  /** surface text (a real word, or punctuation/space) */
  t: string;
  /** true when this piece is a real word */
  w: boolean;
  pinyin: string | null;
  meaning: string | null;
}

interface TranslateResult {
  translation: string;
  pinyin: string | null;
  provider: string;
  tokens?: Token[];
}

interface WordSense {
  pinyin: string | null;
  meaning: string | null;
}

/** Primary provider — Google Translate public endpoint (no key required). */
async function googleTranslate(text: string): Promise<TranslateResult> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&dt=rm&q=" +
    encodeURIComponent(text);

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`google responded ${res.status}`);

  const data: unknown = await res.json();
  const segments =
    Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];

  const translation = segments
    .map((s) => (Array.isArray(s) && typeof s[0] === "string" ? s[0] : ""))
    .join("")
    .trim();
  if (!translation) throw new Error("google returned empty translation");

  /* romanization arrives on index 3 of a segment when dt=rm is requested */
  let pinyin: string | null = null;
  for (const s of segments) {
    if (Array.isArray(s)) {
      const candidate = s[3];
      if (typeof candidate === "string" && candidate.length > 0) {
        pinyin = candidate;
        break;
      }
    }
  }

  return { translation, pinyin, provider: "google" };
}

/** Fallback provider — MyMemory free API. */
async function myMemoryTranslate(text: string): Promise<TranslateResult> {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(text) +
    "&langpair=en|zh-CN";

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`mymemory responded ${res.status}`);

  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
  };
  const translated = data.responseData?.translatedText;
  if (!translated || /MYMEMORY WARNING/i.test(translated)) {
    throw new Error("mymemory returned empty translation");
  }

  return { translation: translated, pinyin: null, provider: "mymemory" };
}

/* ── Per-word dictionary lookups ──────────────────────────────── */

const wordCache = new Map<string, WordSense>();
const WORD_CACHE_MAX = 400;

function cacheSet(word: string, sense: WordSense): void {
  if (!sense.meaning) return;
  if (wordCache.size >= WORD_CACHE_MAX) {
    const oldest = wordCache.keys().next().value;
    if (oldest !== undefined) wordCache.delete(oldest);
  }
  wordCache.set(word, sense);
}

/** Dictionary lookup for a single Chinese word via Google (dt=bd). */
async function googleWord(word: string): Promise<WordSense> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&dt=rm&dt=bd&q=" +
    encodeURIComponent(word);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`google responded ${res.status}`);

  const d = (await res.json()) as unknown[];
  let meaning: string | null = null;

  /* dictionary block: [[part-of-speech, [senses…]], …] */
  if (Array.isArray(d?.[1])) {
    const senses: string[] = [];
    for (const entry of d[1] as unknown[]) {
      if (Array.isArray(entry) && Array.isArray(entry[1])) {
        senses.push(...(entry[1] as string[]));
      }
    }
    meaning =
      [...new Set(senses)].filter(Boolean).slice(0, 3).join(", ") || null;
  }

  /* fall back to the plain translation of the single word */
  if (!meaning && Array.isArray(d?.[0])) {
    const first = (d[0] as unknown[])[0];
    if (Array.isArray(first) && typeof first[0] === "string" && first[0]) {
      meaning = first[0];
    }
  }

  let pinyin: string | null = null;
  if (Array.isArray(d?.[0])) {
    for (const s of d[0] as unknown[]) {
      if (Array.isArray(s) && typeof s[3] === "string" && s[3]) {
        pinyin = s[3];
        break;
      }
    }
  }

  if (!meaning) throw new Error("google returned empty meaning");
  return { pinyin, meaning };
}

/** Fallback single-word lookup via MyMemory. */
async function myMemoryWord(word: string): Promise<WordSense> {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(word) +
    "&langpair=zh-CN|en";
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`mymemory responded ${res.status}`);
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
  };
  const m = data.responseData?.translatedText;
  if (!m || /MYMEMORY WARNING/i.test(m)) throw new Error("mymemory empty");
  return { pinyin: null, meaning: m };
}

async function explainWord(word: string): Promise<WordSense> {
  try {
    return await googleWord(word);
  } catch {
    /* try the next provider */
  }
  try {
    return await myMemoryWord(word);
  } catch {
    /* give up gracefully for this word */
  }
  return { pinyin: null, meaning: null };
}

/** Segment the Chinese sentence and explain every unique word. */
async function buildTokens(chinese: string): Promise<Token[]> {
  const pieces = tokenize(chinese);
  const words = [...new Set(pieces.filter((p) => p.w).map((p) => p.t))];

  const resolved = new Map<string, WordSense>();
  const pending: string[] = [];
  for (const w of words) {
    const hit = wordCache.get(w);
    if (hit) resolved.set(w, hit);
    else pending.push(w);
  }

  const CHUNK = 5; // stay polite with upstream providers
  for (let i = 0; i < pending.length; i += CHUNK) {
    const slice = pending.slice(i, i + CHUNK);
    const senses = await Promise.all(slice.map((w) => explainWord(w)));
    slice.forEach((w, j) => {
      resolved.set(w, senses[j]);
      cacheSet(w, senses[j]);
    });
  }

  return pieces.map(({ t, w }) => {
    const sense = resolved.get(t) ?? { pinyin: null, meaning: null };
    return {
      t,
      w,
      /* local pinyin always works, even when Google is unreachable */
      pinyin: localPinyin(t) ?? sense.pinyin,
      meaning: sense.meaning,
    };
  });
}

export async function POST(req: Request) {
  let text = "";
  try {
    const body = await req.json();
    text = String(body?.text ?? "")
      .trim()
      .slice(0, 500);
  } catch {
    /* fall through to validation error below */
  }

  if (!text) {
    return NextResponse.json(
      { error: "Provide an English sentence to translate." },
      { status: 400 },
    );
  }

  /* normalize spacing so providers parse the sentence cleanly */
  text = text.replace(/\s+/g, " ");

  let result: TranslateResult;
  try {
    result = await googleTranslate(text);
  } catch {
    /* Google unreachable on this network — MyMemory still translates */
    try {
      result = await myMemoryTranslate(text);
    } catch {
      return NextResponse.json(
        { error: "All translation providers are unavailable right now." },
        { status: 502 },
      );
    }
  }

  /* word-by-word breakdown now works for EVERY provider */
  try {
    result.tokens = await buildTokens(result.translation);
  } catch {
    result.tokens = undefined;
  }

  /* guarantee pinyin even when the provider can't supply it */
  if (!result.pinyin) {
    result.pinyin = localPinyin(result.translation);
  }

  return NextResponse.json(result);
}
