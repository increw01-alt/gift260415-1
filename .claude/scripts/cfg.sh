#!/bin/bash
# project.yaml 에서 "섹션.키" 값 하나를 읽어 출력한다. 값이 없으면 빈 줄.
#   bash .claude/scripts/cfg.sh brand.name
#   bash .claude/scripts/cfg.sh modes.rigor [project.yaml 경로]
# 2단계 구조(섹션 아래 키)만 지원한다. 그 이상은 project.yaml 에 두지 않는다.

KEY="${1:-}"
FILE="${2:-project.yaml}"
[ -n "$KEY" ] && [ -f "$FILE" ] || { echo ""; exit 0; }

awk -v want="$KEY" '
BEGIN { n = split(want, p, "."); sec = p[1]; key = p[2]; found = 0 }
{ sub(/\r$/, "") }
/^[ \t]*#/ || /^[ \t]*$/ { next }
/^[A-Za-z_][A-Za-z0-9_-]*:/ { cur = $0; sub(/:.*/, "", cur); next }
/^[ \t]+[A-Za-z_][A-Za-z0-9_-]*:/ {
  if (cur != sec) next
  line = $0; sub(/^[ \t]+/, "", line)
  k = line; sub(/:.*/, "", k)
  if (k != key) next
  v = line; sub(/^[^:]*:[ \t]*/, "", v)
  if (v ~ /^"/)      { sub(/^"/, "", v); sub(/".*$/, "", v) }
  else if (v ~ /^\047/) { sub(/^\047/, "", v); sub(/\047.*$/, "", v) }
  else               { sub(/[ \t]+#.*$/, "", v); sub(/^#.*$/, "", v); sub(/[ \t]+$/, "", v) }
  print v; found = 1; exit
}
END { if (!found) print "" }
' "$FILE"
