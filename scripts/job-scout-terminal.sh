#!/bin/bash
# =============================================================================
# Terminal launcher for Job Scout — opens a new Terminal window so you can
# watch Claude Code work. Called by the LaunchAgent.
# =============================================================================

osascript <<'APPLESCRIPT'
tell application "Terminal"
    activate
    set jobScoutTab to do script "/Users/adityajha/DEVNEW/hermes/exodus/scripts/job-scout.sh; echo ''; echo 'Press any key to close...'; read -n 1"
    set custom title of front window to "Exodus Job Scout"
end tell
APPLESCRIPT
