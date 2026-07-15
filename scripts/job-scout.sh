#!/bin/bash
# =============================================================================
# Exodus Job Scout — Daily automated job discovery via Claude Code
# Runs as a macOS LaunchAgent, opens Terminal, and uses Claude Code to find
# relevant jobs and add them to the Exodus WISHLIST.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/job-scout-prompt.md"
LOG_DIR="$HOME/.exodus/logs"
LOG_FILE="$LOG_DIR/job-scout-$(date +%Y-%m-%d).log"
CLAUDE_BIN="$HOME/.claude/local/claude"
BACKEND_URL="${EXODUS_BACKEND_URL:-http://localhost:3000/api/exodus}"

# Ensure log + scan history directories exist
mkdir -p "$LOG_DIR"
SCAN_HISTORY="$HOME/.exodus/scan-history.tsv"
if [ ! -f "$SCAN_HISTORY" ]; then
  echo -e "URL\tCOMPANY\tROLE\tSTATUS\tDATE" > "$SCAN_HISTORY"
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Exodus Job Scout starting ==="

# Check Claude CLI exists
if [ ! -x "$CLAUDE_BIN" ]; then
  log "ERROR: Claude CLI not found at $CLAUDE_BIN"
  exit 1
fi

# Check prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
  log "ERROR: Prompt file not found at $PROMPT_FILE"
  exit 1
fi

# Quick health check on the backend
HEALTH_CHECK=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 10 "$BACKEND_URL/profile" 2>/dev/null) || true
if [ "$HEALTH_CHECK" != "200" ]; then
  log "ERROR: Backend at $BACKEND_URL returned HTTP $HEALTH_CHECK (expected 200). Skipping today's run."
  exit 1
fi
log "Backend health check passed (HTTP $HEALTH_CHECK)"

# Run Claude Code with stream-json output for real-time progress.
# --output-format stream-json emits one JSON event per line (tool calls,
# results, text) as they happen. We pipe through scout-filter.py which
# prints human-readable progress and saves raw JSON to the log file.
log "Launching Claude Code job scout..."

FILTER="$SCRIPT_DIR/scout-filter.py"
PROMPT=$(cat "$PROMPT_FILE")

echo "$PROMPT" | "$CLAUDE_BIN" --print --verbose \
  --output-format stream-json \
  --allowedTools "Bash(command:curl*),Bash(command:echo*),Bash(command:cat*),WebSearch,WebFetch" \
  --dangerously-skip-permissions 2>/dev/null | \
  python3 -u "$FILTER" "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}
log "Claude Code exited with code $EXIT_CODE"
log "=== Exodus Job Scout finished ==="

exit $EXIT_CODE
