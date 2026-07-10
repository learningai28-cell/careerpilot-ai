// supabase/functions/_shared/claudeClient.ts
//
// Single wrapper around the Anthropic API used by every AI-calling Edge
// Function. Centralizing this means model version, retry-on-malformed-JSON,
// and API key handling only exist in one place.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

interface ClaudeJSONResult<T> {
  data: T;
  tokensUsed: number;
}

/**
 * Calls Claude, instructs it to return ONLY JSON matching the described
 * shape, and parses the result. Retries once with a stricter reminder if
 * the first response isn't valid JSON — structured-output failures are
 * rare but not zero, and a silent 500 is worse than one extra call.
 */
export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<ClaudeJSONResult<T>> {
  const call = async (extraStrictness: boolean) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system:
          systemPrompt +
          (extraStrictness
            ? "\n\nCRITICAL: Your entire response must be a single valid JSON object. No markdown fences, no preamble, no trailing commentary."
            : ""),
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API error (${response.status}): ${text}`);
    }

    const json = await response.json();
    const textBlock = json.content.find((b: any) => b.type === "text");
    const tokensUsed =
      (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0);

    const raw = (textBlock?.text ?? "").trim();
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
