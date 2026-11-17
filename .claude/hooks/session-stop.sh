#!/bin/bash
# Stop 훅 — Claude 가 응답을 마칠 때마다 실행된다 (세션당 1회가 아니라 응답마다).
# settings.json 에 "async": true 로 등록해 응답을 기다리게 하지 않는다.
# 하는 일: 체크포인트 내용이 바뀌었을 때만 그 내용을 날짜별 로그에 덧붙인다.
#          (바뀌지 않았으면 아무것도 쓰지 않는다 — 응답마다 쌓이는 것을 막는다)
# 출력은 어디에도 표시되지 않는다. 파일만 남긴다.

. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cat >/dev/null 2>&1
cd "$WS_ROOT" 2>/dev/null || exit 0

STATE="production/session-state/active.md"
LOGDIR="production/session-logs"
[ -f "$STATE" ] || exit 0
mkdir -p "$LOGDIR" 2>/dev/null || exit 0

HASH="$(git hash-object -- "$STATE" 2>/dev/null)"
[ -z "$HASH" ] && HASH="$(cksum < "$STATE" 2>/dev/null)"
HASH_FILE="$LOGDIR/.active.hash"
if [ -n "$HASH" ] && [ "$HASH" = "$(cat "$HASH_FILE" 2>/dev/null)" ]; then
  exit 0
fi

{
  echo ""
  echo "## $(date '+%Y-%m-%d %H:%M') 체크포인트"
  sed -n '/<!-- CHECKPOINT -->/,/<!-- \/CHECKPOINT -->/p' "$STATE" | grep -v 'CHECKPOINT -->'
} >> "$LOGDIR/$(date +%Y-%m-%d).md" 2>/dev/null
[ -n "$HASH" ] && printf '%s\n' "$HASH" > "$HASH_FILE" 2>/dev/null
exit 0
