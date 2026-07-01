#!/usr/bin/env python3
"""
Reads Claude Code --output-format stream-json on stdin and prints
human-readable progress to the terminal. Also appends raw JSON
to a log file passed as the first argument.
"""
import sys, json, os

log_path = sys.argv[1] if len(sys.argv) > 1 else None
log_file = open(log_path, "a") if log_path else None

def log_raw(line):
    if log_file:
        log_file.write(line + "\n")
        log_file.flush()

def show(msg):
    print(msg, flush=True)

for raw in sys.stdin:
    raw = raw.rstrip("\n")
    if not raw:
        continue
    log_raw(raw)
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        continue

    t = obj.get("type", "")

    if t == "assistant":
        msg = obj.get("message", {})
        for c in msg.get("content", []):
            ct = c.get("type", "")
            if ct == "text":
                sys.stdout.write(c["text"])
                sys.stdout.flush()
            elif ct == "tool_use":
                name = c.get("name", "")
                inp = c.get("input", {})
                if name == "Bash":
                    cmd = inp.get("command", "")
                    # Show first line of command, truncated
                    first_line = cmd.split("\n")[0][:150]
                    show(f"  > {first_line}")
                elif name == "WebSearch":
                    show(f"  [search] {inp.get('query', '')[:120]}")
                elif name == "WebFetch":
                    show(f"  [fetch] {inp.get('url', '')[:120]}")

    elif t == "result":
        cost = obj.get("total_cost_usd", 0)
        dur = obj.get("duration_ms", 0) // 1000
        turns = obj.get("num_turns", 0)
        show(f"\n--- Done in {dur}s | {turns} turns | ${cost:.2f} ---")

if log_file:
    log_file.close()
