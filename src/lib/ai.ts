import "server-only";
import type { Ranked } from "./matching";
import { formatEuros, compactNumber } from "./pricing";

/**
 * The one model call in this product.
 *
 * PLAN section 3 argued the matcher's rationale as a deterministic template,
 * and that argument still holds: the ranking must be reproducible, must cost
 * nothing when a stranger hammers it, and must never name a creator who is not
 * in the database. So the model does not rank anything. The scorer ranks, and
 * the model is handed the scorer's own conclusions and asked only to say them
 * in better prose.
 *
 * Four guards, in order of how much they matter:
 *
 *   1. The shortlist and its reasons are computed before the call and are not
 *      negotiable. The model cannot change who is on the list or why.
 *   2. Any name in the reply that is not on the shortlist voids the reply. A
 *      hallucinated creator is the one failure mode that would be worse than
 *      no AI at all, and it is cheap to detect.
 *   3. A hard daily cap and a short timeout, the same instinct as the profile
 *      importer's quota. Someone hammering the prompt box cannot run up a bill.
 *   4. Every failure falls back to the template silently, and the page says
 *      which one wrote the text. The demo cannot break because a key expired.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
const TIMEOUT_MS = 7000;
const MAX_OUTPUT_TOKENS = 260;

/** Deliberately low. Credits are finite and the fallback is genuinely good. */
const CALLS_PER_DAY = 25;

let windowDay = "";
let callsToday = 0;

function withinDailyCap() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== windowDay) {
    windowDay = today;
    callsToday = 0;
  }
  if (callsToday >= CALLS_PER_DAY) return false;
  callsToday += 1;
  return true;
}

export type RationaleSource = "model" | "template";

/**
 * The facts, compressed. Everything here was already computed by the scorer,
 * so the call carries no prose to re-read and roughly forty tokens per creator.
 */
function factsFor(ranked: Ranked[]) {
  return ranked
    .map(({ creator, score }) => {
      const reasons = score.reasons
        .filter((r) => r.points > 0)
        .map((r) => r.clause)
        .join("; ");
      const views =
        creator.medianViews === null
          ? "no post history, impressions unknown"
          : `${compactNumber(creator.medianViews)} median views`;
      return `- ${creator.displayName}: score ${score.total}/100, ${formatEuros(creator.pricePerPostCents)} per post, ${views}. Why: ${reasons}`;
    })
    .join("\n");
}

const SYSTEM = [
  "HARD RULE: never write he, she, him, her, his or hers. Nothing in the data",
  "states anyone's gender, so guessing it from a name invents a fact. Repeat the",
  "creator's name instead, or use they and their.",
  "You explain a creator shortlist that has already been ranked. You do not rank.",
  "Write three short paragraphs, plain sentences, no headings, no bullet points, no markdown.",
  "Paragraph 1: one sentence saying how many creators and what they were ranked on.",
  "Paragraph 2: name each creator once with the single strongest reason given for them.",
  "Paragraph 3: the trade-off a buyer is actually making between these specific creators.",
  "Use only the names and figures given. Never invent a creator, a number or a claim.",
  "A creator with no post history has unknown impressions: say so, never estimate.",
  "Do not mention the numeric score; say what it was based on instead.",
  "British spelling. Separate paragraphs with a blank line. Under 130 words total.",
  'Example of the required style: "Nina C. brings the largest measured audience,',
  'while Alex N. is cheaper but has no post history to judge Alex N. on."',
].join(" ");

/**
 * Returns null on anything that is not a clean, verified answer. The caller
 * falls back to the template, which is always computed first.
 */
export async function rationaleFromModel(
  brandName: string,
  prompt: string,
  ranked: Ranked[],
): Promise<string[] | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || ranked.length === 0) return null;
  if (!withinDailyCap()) return null;

  const user = [
    `Brand: ${brandName}`,
    `They asked: ${prompt.slice(0, 300)}`,
    `Shortlist, already ranked:`,
    factsFor(ranked),
    // Repeated last because the final line is the one a small model obeys.
    `Reminder: no he, she, him, her, his or hers anywhere in your answer.`,
  ].join("\n");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "naano",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.replace(/^[-*#>\s]+/, "").trim())
      .filter(Boolean);
    if (paragraphs.length === 0) return null;

    // Guard 2. Our display names all have the shape "First L.", so an invented
    // creator is caught by scanning for that shape and requiring every hit to
    // be on the shortlist. Checking every capitalised word instead would flag
    // ordinary sentence-initial prose and reject almost every good answer.
    const allowed = new Set(ranked.map(({ creator }) => creator.displayName));
    const named = text.match(/\b[A-Z][a-z]+ [A-Z]\./g) ?? [];
    if (named.some((n) => !allowed.has(n))) return null;

    // Guard 2b. Gendered pronouns are the same failure in a smaller costume:
    // nothing in the data states anyone's gender, so the model guessed it from
    // a name. Instructing against it is not enough, so it is enforced here.
    if (/\b(he|she|him|her|his|hers)\b/i.test(text)) return null;

    return paragraphs;
  } catch {
    return null;
  }
}

