"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type LineKind = "system" | "user" | "translation" | "error";

interface Token {
  /** surface text (real word or punctuation) */
  t: string;
  /** true when this piece is a real word */
  w: boolean;
  pinyin: string | null;
  meaning: string | null;
}

interface Line {
  id: number;
  kind: LineKind;
  text: string;
  pinyin?: string | null;
  provider?: string;
  typing?: boolean;
  tokens?: Token[];
}

interface TranslateResponse {
  translation?: string;
  pinyin?: string | null;
  provider?: string;
  tokens?: Token[];
  error?: string;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BOOT_TEXT = [
  "fardinApp translator v1.0.0 — english → 简体中文",
  "Type any English sentence and press Enter to translate it.",
  "Type /help to list available commands.",
];

let nextId = 1;

function bootLines(): Line[] {
  return BOOT_TEXT.map((text) => ({ id: nextId++, kind: "system" as const, text }));
}

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>(bootLines);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const intervalsRef = useRef<number[]>([]);

  const pushLine = useCallback((line: Omit<Line, "id">) => {
    setLines((prev) => [...prev, { ...line, id: nextId++ }]);
  }, []);

  /* auto-scroll to the newest line */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  /* clean up any running typewriter/spinner timers */
  useEffect(() => {
    const pending = intervalsRef.current;
    return () => pending.forEach((t) => window.clearInterval(t));
  }, []);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  /* desktop: focus on load · mobile: wait for a tap so the keyboard
     doesn't jump up the moment the page opens */
  useEffect(() => {
    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);

  /* reveal a translation character by character, like real CLI output */
  const typewrite = useCallback((targetId: number, full: string) => {
    let shown = 0;
    const step = Math.max(1, Math.ceil(full.length / 70));
    const timer = window.setInterval(() => {
      shown += step;
      const done = shown >= full.length;
      setLines((prev) =>
        prev.map((l) =>
          l.id === targetId ? { ...l, text: full.slice(0, shown), typing: !done } : l,
        ),
      );
      if (done) window.clearInterval(timer);
    }, 16);
    intervalsRef.current.push(timer);
  }, []);

  const runTranslate = useCallback(
    async (sentence: string) => {
      pushLine({ kind: "user", text: sentence });
      setBusy(true);

      /* braille spinner while waiting for the API */
      const spinnerId = nextId++;
      setLines((prev) => [
        ...prev,
        { id: spinnerId, kind: "system", text: `${SPINNER[0]} translating…` },
      ]);
      let frame = 0;
      const spinnerTimer = window.setInterval(() => {
        frame = (frame + 1) % SPINNER.length;
        setLines((prev) =>
          prev.map((l) =>
            l.id === spinnerId ? { ...l, text: `${SPINNER[frame]} translating…` } : l,
          ),
        );
      }, 80);
      intervalsRef.current.push(spinnerTimer);

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sentence }),
        });
        const data: TranslateResponse = await res.json();

        window.clearInterval(spinnerTimer);
        setLines((prev) => prev.filter((l) => l.id !== spinnerId));

        if (!res.ok || !data.translation) {
          pushLine({
            kind: "error",
            text: `✗ translation failed${data.error ? ` — ${data.error}` : ""}`,
          });
        } else {
          const lineId = nextId++;
          setLines((prev) => [
            ...prev,
            {
              id: lineId,
              kind: "translation",
              text: "",
              pinyin: data.pinyin ?? null,
              provider: data.provider,
              tokens: data.tokens,
              typing: true,
            },
          ]);
          typewrite(lineId, data.translation);
        }
      } catch {
        window.clearInterval(spinnerTimer);
        setLines((prev) => prev.filter((l) => l.id !== spinnerId));
        pushLine({
          kind: "error",
          text: "✗ network error — check your connection and try again",
        });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [pushLine, typewrite],
  );

  const handleCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim().toLowerCase();
      pushLine({ kind: "user", text: raw });

      if (cmd === "/help") {
        pushLine({ kind: "system", text: "Available commands:" });
        pushLine({ kind: "system", text: "  /help    show this help message" });
        pushLine({ kind: "system", text: "  /clear   wipe the terminal screen" });
        pushLine({ kind: "system", text: "  /about   what is this thing?" });
      } else if (cmd === "/clear") {
        setLines([]);
      } else if (cmd === "/about") {
        pushLine({
          kind: "system",
          text: "fardinApp v1.0.0 — a terminal-styled english → 简体中文 translator.",
        });
        pushLine({
          kind: "system",
          text: "Every answer includes pinyin + a word-by-word breakdown so you can learn.",
        });
      } else {
        pushLine({ kind: "error", text: `✗ unknown command: ${cmd} — type /help` });
      }
    },
    [pushLine],
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || busy) return;

    setInput("");
    setHistory((h) => [...h, value]);
    setHistoryIndex(null);

    if (value.startsWith("/")) {
      handleCommand(value);
    } else {
      void runTranslate(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLines([]);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const idx =
        historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(idx);
      setInput(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;
      const idx = historyIndex + 1;
      if (idx >= history.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(idx);
        setInput(history[idx]);
      }
    }
  };

  const renderLine = (l: Line) => {
    switch (l.kind) {
      case "user":
        return (
          <p key={l.id} className="whitespace-pre-wrap break-all">
            <span className="text-muted">~/translate </span>
            <span className="text-primary">❯ </span>
            <span className="font-medium text-ink">{l.text}</span>
          </p>
        );
      case "translation":
        return (
          <div key={l.id} className="mb-1">
            <p className="break-all text-white">
              <span className="mr-2 text-success">✓</span>
              {l.text}
              {l.typing ? <span className="blink">▌</span> : null}
            </p>
            {!l.typing && l.pinyin ? (
              <p className="pl-4 text-muted">拼音 · {l.pinyin}</p>
            ) : null}
            {!l.typing && l.tokens && l.tokens.some((t) => t.w) ? (
              <div className="ml-4 mt-1.5 border-t border-hairline pt-1.5">
                <p className="eyebrow mb-1.5">word by word · 每个词</p>
                <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-3 gap-y-0.5">
                  {l.tokens
                    .filter((t) => t.w)
                    .map((tok, i) => (
                      <Fragment key={`${tok.t}-${i}`}>
                        <span className="text-white">{tok.t}</span>
                        <span className="pr-2 text-secondary">
                          {tok.pinyin ?? "—"}
                        </span>
                        <span className="break-words text-muted">
                          {tok.meaning ?? "—"}
                        </span>
                      </Fragment>
                    ))}
                </div>
              </div>
            ) : null}
            {!l.typing && l.provider ? (
              <p className="mt-1 pl-4 text-[10px] uppercase tracking-wider text-muted opacity-60">
                via {l.provider}
              </p>
            ) : null}
          </div>
        );
      case "error":
        return (
          <p key={l.id} className="whitespace-pre-wrap text-warning">
            {l.text}
          </p>
        );
      default:
        return (
          <p key={l.id} className="whitespace-pre-wrap text-muted">
            {l.text}
          </p>
        );
    }
  };

  return (
    <div
      className="card-ring card-ring-focus mx-auto w-full max-w-3xl overflow-hidden rounded-lg bg-elevated"
      onClick={focusInput}
    >
      {/* title bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-hairline px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-surface" />
          <span className="h-2.5 w-2.5 rounded-full bg-surface" />
          <span className="h-2.5 w-2.5 rounded-full bg-surface" />
        </div>
        <span className="eyebrow">fardin@app — translate</span>
        <span />
      </div>

      {/* output */}
      <div
        ref={scrollRef}
        className="term-scroll h-[360px] space-y-1 overflow-y-auto p-4 font-mono text-[13px] leading-[19.5px] sm:h-[400px] sm:p-5"
        aria-live="polite"
      >
        {lines.map(renderLine)}
      </div>

      {/* input */}
      <form onSubmit={handleSubmit} className="border-t border-hairline">
        <div className="flex items-center gap-2 px-4 py-3 font-mono text-[13px] sm:px-5">
          <label htmlFor="terminal-input" className="shrink-0 select-none">
            <span className="text-muted">~/translate </span>
            <span className="text-primary">❯</span>
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            disabled={busy}
            placeholder={busy ? "translating…" : "type an English sentence…"}
            aria-label="English sentence to translate"
            className="term-input min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-[#52525b]"
            style={{ caretColor: "var(--color-primary)" }}
          />
        </div>
      </form>

      {/* hint bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline px-4 py-2 font-mono text-[10.5px] text-muted sm:px-5">
        <span>
          <kbd>enter</kbd>translate
        </span>
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>history
        </span>
        <span>
          <kbd>ctrl+l</kbd>clear
        </span>
        <span className="ml-auto hidden sm:inline">/help for commands</span>
      </div>
    </div>
  );
}
