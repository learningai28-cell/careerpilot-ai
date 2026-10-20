// supabase/functions/_shared/claudeClient.ts
//
// Single wrapper around the Anthropic API used by every AI-calling Edge
// Function. Centralizing this means model version, timeouts, retry/backoff,
// retry-on-malformed-JSON, and API key handling only exist in one place.
//
// Reliability: Claude occasionally returns 429/529 (overloaded) or hangs.
// Rather than surface a raw 500 to the user, we time out each attempt, retry
// transient failures with backoff, and — if it still fails — throw a
// ClaudeBusyError whose message is safe to show directly to the user.
// Everything runs under one shared deadline so we stay inside the Supabase
// Edge Function wall-clock limit (~150s).

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const DEFAULT_MODEL = "claude-sonnet-5-5";
const DEFAULT_MAX_TOKENS = 4096;

// --- Timeout / retry tuning -------------------------------------------------
const ATTEMPT_TIMEOUT_MS = 60_000; // per HTTP attempt
const TOTAL_BUDGET_MS = 105_000; // hard ceiling across ALL attempts + backoff
const MAX_RETRIES = 2; // i.e. up to 3 attempts per logical call
const BASE_BACKOFF_MS = 1_000; // 1s, 2s (+ jitter) between attempts
const MAX_RETRY_AFTER_MS = 20_000; // never sleep longer than this for retry-after
const MIN_USEFUL_ATTEMPT_MS = 8_000; // don't start an attempt with less time left
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);

const SONNET = "claude-sonnet-5-5"; // $2 / $10 per MTok (Sonnet 4.6 was $3 / $15)
const HAIKU = "claude-haiku-5-5"; // $0.10 / $0.50 per MTok

/**
 * Recommended model + output-token budget per task. Callers pass these as
 * `options`. Rationale:
 *  - Sonnet where judgement quality is the product (analysis, generation).
 *  - Haiku for simpler structured tasks (scoring a short answer, reshaping
 *    resume text into fields) — far cheaper and faster.
 *  - Thinking is turned off for every task: these are single-shot JSON
 *    tasks, and on the 5.5 models thinking is on by default, is billed as
 *    output, and counts against max_tokens (which truncated the JSON).
 *    Sonnet 5.5 turns it off with "between_tools"; Haiku 5.5 with "disabled".
 *  - maxTokens is sized to the prompt's real JSON output plus ~50-100%
 *    headroom, because truncated JSON fails the call outright, which costs
 *    far more than unused headroom (you only pay for tokens generated).
 */
export const CLAUDE_TASKS = {
  // ~1.5-2k tokens of JSON (6 lists, up to 10 skills, per-section feedback).
  resumeAnalysis: { model: SONNET, maxTokens: 3500 },
  // ~1.5-2.5k tokens (JD breakdown lists + match score + gap + recommendations).
  jdAnalysis: { model: SONNET, maxTokens: 4096 },
  // 8 questions, each with a 3-5 sentence sample answer + follow-ups
  // ≈ 2.5-3.5k tokens; this is the largest output, so give it the most room.
  interviewGeneration: { model: SONNET, maxTokens: 6000 },
  // Short feedback object (~500-700 tokens). Simple rubric task -> Haiku.
  answerScoring: { model: HAIKU, maxTokens: 1500 },
  // Mechanical restructuring; output is roughly as long as the resume itself
  // (up to ~25k chars ≈ 6k tokens input cap), so allow generous room. Haiku.
  resumeDataExtraction: { model: HAIKU, maxTokens: 8000 },
} as const;

export interface ClaudeCallOptions {
  model?: string;
  maxTokens?: number;
}

/** Model-specific request fields that switch thinking off. */
function thinkingOff(model: string) {
  if (model.startsWith("claude-sonnet-5-5")) return { type: "between_tools" };
  if (model.startsWith("claude-haiku-5-5")) return { type: "disabled" };
  return undefined; // older models: thinking is off unless requested
}

interface ClaudeJSONResult<T> {
  data: T;
  tokensUsed: number;
}

/**
 * Thrown when Claude is overloaded / timing out and retries are exhausted.
 * The message is user-facing; the request never produced a usable result, so
 * callers should NOT count it against the user's plan usage.
 */
export class ClaudeBusyError extends Error {
  constructor(
    message = "Our AI is busy right now. Please try again in a minute — this attempt wasn't counted against your plan."
  ) {
    super(message);
    this.name = "ClaudeBusyError";
  }
}

export function isClaudeBusyError(err: unknown): err is ClaudeBusyError {
  return err instanceof ClaudeBusyError;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parses a `retry-after` header (seconds or HTTP date) into ms, or null. */
function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * Sends one logical request to the Messages API with timeout + retry.
 * Returns the parsed response JSON. Throws ClaudeBusyError when transient
 * failures persist, or a plain Error for non-retryable failures.
 */
async function fetchWithRetry(
  body: string,
  deadline: number,
  extraHeaders: Record<string, string> = {}
): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_USEFUL_ATTEMPT_MS) throw new ClaudeBusyError();

    let retryAfterMs: number | null = null;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(ATTEMPT_TIMEOUT_MS, remaining)
    );

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          ...extraHeaders,
        },
        body,
        signal: controller.signal,
      });

      if (response.ok) {
        // Body read stays under the same abort signal/timer.
        return await response.json();
      }

      if (!RETRYABLE_STATUS.has(response.status)) {
        // 400/401/403/404/413 etc: retrying can't help.
        const text = await response.text();
        throw new Error(`Claude API error (${response.status}): ${text}`);
      }

      retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await response.body?.cancel();
      console.warn(`Claude API transient error ${response.status} (attempt ${attempt + 1})`);
    } catch (err) {
      // Timeouts and network failures are retryable; our own thrown Errors
      // for non-retryable statuses are not (they have no AbortError/TypeError shape).
      const isTransport =
        err instanceof TypeError ||
        (err instanceof DOMException &&
          (err.name === "AbortError" || err.name === "TimeoutError"));
      if (!isTransport) throw err;
      console.warn(`Claude API network/timeout error (attempt ${attempt + 1}): ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (attempt >= MAX_RETRIES) throw new ClaudeBusyError();

    // Exponential backoff with full-ish jitter; honour retry-after if given.
    const backoff =
      BASE_BACKOFF_MS * 2 ** attempt * (0.75 + Math.random() * 0.5);
    const wait = Math.min(
      retryAfterMs !== null ? Math.max(retryAfterMs, backoff) : backoff,
      MAX_RETRY_AFTER_MS
    );
    if (deadline - Date.now() - wait < MIN_USEFUL_ATTEMPT_MS) {
      throw new ClaudeBusyError();
    }
    await sleep(wait);
  }
}

/**
 * Calls Claude, instructs it to return ONLY JSON matching the described
 * shape, and parses the result. Retries once with a stricter reminder if
 * the first response isn't valid JSON — structured-output failures are
 * rare but not zero, and a silent 500 is worse than one extra call.
 *
 * `options` are optional (defaults: Sonnet 5.5, 4096 tokens). See
 * CLAUDE_TASKS for recommended per-task values.
 */
export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options: ClaudeCallOptions = {}
): Promise<ClaudeJSONResult<T>> {
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  // One deadline shared by both the normal call and the invalid-JSON retry.
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  // NOTE on prompt caching: deliberately not enabled. Every system prompt in
  // this app is well under the minimum cacheable length (1024 tokens Sonnet,
  // 2048 Haiku), so cache_control would be silently ignored.
  // Sonnet 5.5 can decline a request (stop_reason "refusal"). "default"
  // fallbacks let the API re-run it on a suitable model inside the same call
  // instead of failing the user's (already metered) request.
  const useFallbacks = model.startsWith("claude-sonnet-5-5");
  const headers: Record<string, string> = useFallbacks
    ? { "anthropic-beta": "server-side-fallback-2026-07-01" }
    : {};

  const call = async (extraStrictness: boolean) => {
    const thinking = thinkingOff(model);
    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(thinking ? { thinking } : {}),
      ...(useFallbacks ? { fallbacks: "default" } : {}),
      system:
        systemPrompt +
        (extraStrictness
          ? "\n\nCRITICAL: Your entire response must be a single valid JSON object. No markdown fences, no preamble, no trailing commentary."
          : ""),
      messages: [{ role: "user", content: userPrompt }],
    });

    const json = await fetchWithRetry(body, deadline, headers);
    const tokensUsed =
      (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0);

    if (json.stop_reason === "refusal") {
      throw new Error(`Claude declined the request (${json.stop_details?.category ?? "unknown"}).`);
    }
    if (json.stop_reason === "max_tokens") {
      // A stricter retry would hit the same cap and just cost more.
      throw new Error(`Claude output hit max_tokens (${maxTokens}) for ${model}.`);
    }

    // After a fallback, earlier blocks belong to the model that declined;
    // only text after the last fallback block is the answer.
    const blocks: any[] = json.content ?? [];
    const lastFallback = blocks.map((b) => b.type).lastIndexOf("fallback");
    const raw = blocks
      .slice(lastFallback + 1)
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    return { cleaned, tokensUsed };
  };

  let { cleaned, tokensUsed } = await call(false);

  try {
    return { data: JSON.parse(cleaned) as T, tokensUsed };
  } catch {
    // One retry with a stricter instruction before giving up.
    const retry = await call(true);
    tokensUsed += retry.tokensUsed;
    try {
      return { data: JSON.parse(retry.cleaned) as T, tokensUsed };
    } catch {
      throw new Error("Claude did not return valid JSON after retry.");
    }
  }
}
