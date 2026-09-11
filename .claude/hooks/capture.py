#!/usr/bin/env python3
"""Capture each prompt and each final response into .agent-logs/.

Wired to two Claude Code hooks in .claude/settings.json:
  UserPromptSubmit -> capture.py prompt    (prompt text arrives on stdin)
  Stop             -> capture.py response  (final assistant message, read from the transcript)

Thinking, tool calls and intermediate steps are deliberately not captured.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

AUTHOR = "CulturalProfessor"
PROJECT_NAME = "naano-rebuild"
TOOL = "claude-code"

PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
LOG_DIR = PROJECT_DIR / ".agent-logs"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def read_event() -> dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def final_response(transcript_path: str):
    """Last assistant message of the turn, as (text, model). Skips subagent sidechains."""
    path = Path(transcript_path or "")
    if not path.is_file():
        return None, None
    entries = []
    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    for entry in reversed(entries):
        if entry.get("type") != "assistant" or entry.get("isSidechain"):
            continue
        message = entry.get("message") or {}
        blocks = message.get("content") or []
        if isinstance(blocks, str):
            text = blocks
        else:
            text = "\n".join(
                b.get("text", "") for b in blocks
                if isinstance(b, dict) and b.get("type") == "text"
            )
        text = text.strip()
        if text:
            return text, message.get("model")
    return None, None


def known_model(transcript_path: str) -> str:
    _, model = final_response(transcript_path)
    return model or "unknown"


def session_file(session_id: str, timestamp: str, model: str) -> Path:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    existing = sorted(LOG_DIR.glob(f"*_{session_id}.md"))
    if existing:
        return existing[0]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    path = LOG_DIR / f"{stamp}_{session_id}.md"
    date = timestamp[:10]
    path.write_text(
        "---\n"
        f"session_id: {session_id}\n"
        f"date: {date}\n"
        f"author: {AUTHOR}\n"
        f"model: {model}\n"
        f"tool: {TOOL}\n"
        f"project: {PROJECT_NAME}\n"
        "total_exchanges: 0\n"
        f"first_prompt_time: {timestamp}\n"
        f"last_prompt_time: {timestamp}\n"
        "---\n\n"
        f"# Session Log - {date}\n\n"
        f"Session: `{session_id[:8]}` | Project: `{PROJECT_NAME}` | Author: `{AUTHOR}`\n\n"
        "---\n\n",
        encoding="utf-8",
    )
    return path


def append(kind: str, session_id: str, text: str, model: str) -> None:
    timestamp = utc_now()
    path = session_file(session_id, timestamp, model)
    body = path.read_text(encoding="utf-8")

    if kind == "RESPONSE":
        last = list(re.finditer(r"\[LOG_ENTRY type=(\w+) num=(\d+) ", body))
        if last and last[-1].group(1) == "RESPONSE" and body.rstrip().endswith(text.rstrip()):
            return  # same response already logged (Stop can fire more than once)

    num = len(re.findall(r"\[LOG_ENTRY type=PROMPT ", body))
    if kind == "PROMPT":
        num += 1

    body += (
        f"[LOG_ENTRY type={kind} num={num} session={session_id[:8]}]\n"
        f"timestamp: {timestamp}\n"
        f"model: {model}\n\n"
        f"{text.strip()}\n\n\n"
    )

    if model != "unknown":
        body = body.replace("model: unknown", f"model: {model}")
    body = re.sub(r"^total_exchanges: .*$", f"total_exchanges: {num}", body, count=1, flags=re.M)
    body = re.sub(r"^last_prompt_time: .*$", f"last_prompt_time: {timestamp}", body, count=1, flags=re.M)
    path.write_text(body, encoding="utf-8")


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "prompt"
    event = read_event()
    session_id = event.get("session_id") or "unknown-session"
    transcript = event.get("transcript_path", "")

    if mode == "prompt":
        prompt = event.get("prompt", "")
        if prompt.strip():
            append("PROMPT", session_id, prompt, known_model(transcript))
    else:
        text, model = final_response(transcript)
        if text:
            append("RESPONSE", session_id, text, model or "unknown")
    return 0


if __name__ == "__main__":
    sys.exit(main())
