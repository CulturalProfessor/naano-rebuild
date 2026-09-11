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
takes the last non-sidechain assistant message, keeping only its `text` blocks. Thinking
blocks, tool calls, file reads and self-corrections inside a turn are dropped on purpose.
A repeated `Stop` for the same turn is detected and skipped, so no response is logged twice.

Logs are written to `.agent-logs/`, one file per session, named
`YYYY-MM-DD_HH-MM-SS_<session-id>.md`. `.gitignore` explicitly does not exclude them.

## Canary test

Log file: _pending_

### Canary 1 (session 1)

_pending_

### Canary 2 (a second, separate session)

_pending_

## Things that did not work

_pending_
