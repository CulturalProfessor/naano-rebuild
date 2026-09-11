# Capture test

## Tool and model

- Tool: Claude Code (desktop app, Code tab)
- Model: Opus 5 (`claude-opus-5`) plans and executes. The model name is read per turn
  from the session transcript, so a mid-build switch shows up in the log itself.

## Mechanism

Claude Code hooks, configured in `.claude/settings.json` (committed):

| Event | Command | What it writes |
|---|---|---|
| `UserPromptSubmit` | `.claude/hooks/capture.py prompt` | the prompt, verbatim, from the hook's stdin payload |
| `Stop` | `.claude/hooks/capture.py response` | the final assistant message of the turn |

Both fire automatically. Nothing is run by hand.

The `Stop` payload carries `transcript_path`, so the hook reads the session JSONL and
takes the last non-sidechain assistant message of the current turn, keeping only its
`text` blocks. Thinking
blocks, tool calls, file reads and self-corrections inside a turn are dropped on purpose.
A repeated `Stop` for the same turn is detected and skipped, so no response is logged twice.

Logs are written to `.agent-logs/`, one file per session, named
`YYYY-MM-DD_HH-MM-SS_<session-id>.md`. `.gitignore` explicitly does not exclude them.

## Canary test

The same canary line was typed as the first prompt of two separate sessions:

> CAPTURE TEST — 8x assignment, Vinayak Sharma

Each session got its own file in `.agent-logs/`, keyed by session id. Nothing was
copied in by hand.

### Canary 1 (session 1)

`.agent-logs/2026-09-11_15-16-47_2d1c6689-5a01-49d8-ab07-d9cb8cb2da19.md`

- `UserPromptSubmit` created the file and wrote `PROMPT num=1` with the canary verbatim,
  em dash intact, before any work started.
- `Stop` appended `RESPONSE num=1` with only the final assistant text.
- `model` was back-filled to `claude-opus-5` and `total_exchanges` moved to 1.

### Canary 2 (a second, separate session)

`.agent-logs/2026-09-11_15-17-32_3799ae06-9c84-4527-aaab-2fdf5fb22aca.md`

- A new session id produced a new file rather than appending to canary 1's.
- The prompt entry was written with `model: unknown`, which is what the first prompt of a
  session always sees, then back-filled once the reply landed.
- This session is the one that found and fixed the two defects below.

## Things that did not work

Each of these was reproduced against a synthetic transcript before being called a defect.

1. **The model is not readable on a session's first prompt.** `UserPromptSubmit` runs
   before any assistant message exists, so the hook has nothing to read and writes
   `unknown`. `Stop` back-fills it. This is inherent to the hook order, not a bug, but it
   means a prompt entry's model is evidence from the reply, not from the prompt.

2. **The back-fill relabelled turns it had no evidence about.** It was a plain string
   replace over the whole file, so the first known model overwrote *every* `unknown` in
   it, including older turns whose model genuinely was not known. Reproduced by logging a
   turn with an unreadable transcript, then a later turn with a good one: the old turn
   silently acquired the new turn's model. Now the back-fill touches only the frontmatter
   and the prompt that the current response answers.

3. **A turn ending without a text block re-logged the previous turn's answer.** `Stop`
   scanned backwards for the last assistant text anywhere in the transcript. Reproduced
   with a turn whose last message was a lone tool call: the previous answer was written
   again as a fresh `RESPONSE`, under the new turn's number. The read is now bounded to
   entries after the most recent user entry, so such a turn logs nothing instead.

4. **Frontmatter records the first known model, not the latest.** After a mid-session
   model switch the frontmatter still names the original. The per-entry `model` lines do
   follow the switch, so the detail is in the log, just not in the header.

5. **A missing or unreadable transcript loses the response, not the prompt.** `Stop` has
   no other source for the reply text, so it writes nothing. The log can therefore hold a
   prompt with no matching response.

Deliberately excluded and confirmed excluded: thinking blocks, tool calls, and subagent
sidechain messages. A repeated `Stop` for one turn is still detected and skipped.
