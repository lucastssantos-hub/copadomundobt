#!/usr/bin/env sh
# SessionStart hook: injects the full i-have-adhd ruleset into context on every
# session so ADHD mode is always active in this project.
# Never blocks session start: any failure exits 0.

# Resolve SKILL.md relative to this script's own location.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 0
skill_path="$script_dir/SKILL.md"
[ -f "$skill_path" ] || exit 0

# Strip a leading YAML frontmatter block (--- ... --- at the very top of file).
body=$(awk '
  NR == 1 && $0 ~ /^---[[:space:]]*$/ { in_fm = 1; next }
  in_fm && $0 ~ /^---[[:space:]]*$/   { in_fm = 0; next }
  !in_fm                              { print }
' "$skill_path") || exit 0

printf 'ADHD MODE ACTIVE (always-on). The ruleset below applies to every response for the rest of this session. Say "stop adhd mode" or "normal mode" to turn it off.\n\n%s\n' "$body"
