#!/bin/bash
# =============================================================================
# Exodus Job Scout — Daily preview + notification
#
# Calls the backend's preview endpoint (fetch + filter + score, NO insert),
# then sends a macOS notification asking the user to confirm via the UI.
# Runs as a macOS LaunchAgent at 9:00 AM daily.
# =============================================================================

set -euo pipefail

BACKEND_URL="${EXODUS_BACKEND_URL:-http://13.214.26.96/api/exodus}"
LOG_DIR="$HOME/.exodus/logs"
LOG_FILE="$LOG_DIR/scout-cron-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Exodus Scout Cron: preview run ==="

# Health check
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 10 "$BACKEND_URL/profile" 2>/dev/null) || true
if [ "$HEALTH" != "200" ]; then
  log "ERROR: Backend at $BACKEND_URL returned HTTP $HEALTH. Skipping."
  osascript -e "display notification \"Backend unreachable (HTTP $HEALTH). Scout skipped.\" with title \"Exodus Scout\" subtitle \"Error\""
  exit 1
fi
log "Backend health check passed."

# Call the preview endpoint (dry run — fetches, filters, scores, but does NOT insert)
log "Calling preview endpoint..."
RESPONSE=$(curl -s -X POST "$BACKEND_URL/scout/preview" --connect-timeout 15 --max-time 300 2>/dev/null) || true

if [ -z "$RESPONSE" ]; then
  log "ERROR: No response from backend."
  osascript -e "display notification \"No response from backend. Check logs.\" with title \"Exodus Scout\" subtitle \"Error\""
  exit 1
fi

# Parse the response with python3
JOBS_FOUND=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('jobsAdded', 0))
except:
    print(0)
" 2>/dev/null)

COMPANIES_CHECKED=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('companiesChecked', 0))
except:
    print(0)
" 2>/dev/null)

JOBS_SKIPPED=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('jobsSkipped', 0))
except:
    print(0)
" 2>/dev/null)

log "Preview complete: $JOBS_FOUND jobs found, $JOBS_SKIPPED skipped, $COMPANIES_CHECKED companies checked."

if [ "$JOBS_FOUND" -eq 0 ]; then
  osascript -e "display notification \"No new matching jobs found today ($COMPANIES_CHECKED companies scanned).\" with title \"Exodus Scout\""
  log "No jobs found. Done."
  exit 0
fi

# Show macOS notification with summary + open the UI for confirmation
EXODUS_UI_URL="${EXODUS_UI_URL:-http://localhost:5173/pipeline}"

osascript <<APPLESCRIPT
display notification "Found $JOBS_FOUND new jobs from $COMPANIES_CHECKED companies. Open Exodus to review and confirm." with title "Exodus Scout" subtitle "Preview ready"
delay 1
do shell script "open '$EXODUS_UI_URL'"
APPLESCRIPT

log "Notification sent. UI opened at $EXODUS_UI_URL"
log "=== Done ==="
