#!/bin/bash
# PreToolUse(Bash) 훅 — git push 직전에만 일한다.
#   차단(종료 코드 2): 강제 push (--force, -f, +refspec)
#   승인 요청: 배포 브랜치로 가는 push → 사람의 승인 창을 강제로 띄운다
#   그 외 push: 통과 (settings.json 의 permissions.ask 가 따로 확인을 받는다)

. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
INPUT="$(cat)"

case "$INPUT" in *git*push*) ;; *) exit 0 ;; esac
CMD="$(printf '%s' "$INPUT" | ws_command)"
PUSH_RE='(^|[;&|(]|[[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([[:space:]]|$)'
printf '%s' "$CMD" | grep -Eq "$PUSH_RE" || exit 0

cd "$WS_ROOT" 2>/dev/null || exit 0
PROD="$(ws_cfg deploy.production_branch)"; [ -z "$PROD" ] && PROD="main"
PROVIDER="$(ws_cfg deploy.provider)"; [ -z "$PROVIDER" ] && PROVIDER="배포 서비스"
BRANCH="$(git symbolic-ref --short -q HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null)"

# 여러 명령이 이어져 있으면 push 가 들어 있는 조각만 본다.
SEG="$(printf '%s\n' "$CMD" | tr ';&|' '\n\n\n' | grep -E "$PUSH_RE" | head -1)"
ARGS="$(printf '%s' "$SEG" | sed -E 's/^.*[[:space:]]push([[:space:]]+|$)//')"

# 강제 push
if printf ' %s ' "$ARGS" | grep -Eq '[[:space:]](--force|--force-with-lease[^[:space:]]*|--mirror|-[A-Za-z]*f[A-Za-z]*)[[:space:]]|[[:space:]]\+[^[:space:]]+'; then
  echo "push 차단: 강제 push 와 히스토리 재작성은 이 프로젝트에서 금지입니다. 일반 push 로 해결되지 않으면 재욱님에게 상황을 보고하세요." >&2
  exit 2
fi

# 목적지 브랜치 판별: 옵션을 뺀 인자 = [원격] [refspec...]
TARGET_PROD=0
if printf ' %s ' "$ARGS" | grep -Eq '[[:space:]]--all[[:space:]]'; then
  TARGET_PROD=1
fi
POS=""
for tok in $ARGS; do
  tok="${tok//\"/}"; tok="${tok//\'/}"
  case "$tok" in -*|"") ;; *) POS="$POS $tok" ;; esac
done
set -- $POS
if [ $# -le 1 ]; then
  # refspec 이 없으면 현재 브랜치를 올린다
  [ "$BRANCH" = "$PROD" ] && TARGET_PROD=1
else
  shift
  for ref in "$@"; do
    dst="${ref##*:}"; dst="${dst#refs/heads/}"
    [ "$dst" = "HEAD" ] && dst="$BRANCH"
    [ "$dst" = "$PROD" ] && TARGET_PROD=1
  done
fi

if [ "$TARGET_PROD" -eq 1 ]; then
  ws_ask "[배포 확인] '$PROD' 브랜치 push 는 $PROVIDER 실제 배포입니다. /launch 점검을 마쳤는지 확인하고, 재욱님이 직접 승인해야 진행됩니다."
fi
exit 0
