#!/bin/bash
# SessionStart 훅 — 세션이 시작·재개·압축될 때마다 실행된다.
# 여기서 출력한 글은 그대로 Claude 의 컨텍스트에 들어간다.
# 하는 일: 사이트 정보, 브랜치 상태, 지난 세션의 체크포인트를 보여 준다.
# 아무것도 막지 않는다 (항상 종료 코드 0).

. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cat >/dev/null 2>&1   # 입력 JSON 은 쓰지 않는다
cd "$WS_ROOT" 2>/dev/null || exit 0

NAME="$(ws_cfg brand.name)"
DOMAIN="$(ws_cfg brand.domain)"
KEY="$(ws_cfg brand.key)"
RIGOR="$(ws_cfg modes.rigor)"; [ -z "$RIGOR" ] && RIGOR="minimal"
PROD="$(ws_cfg deploy.production_branch)"; [ -z "$PROD" ] && PROD="main"

echo "=== 웹 스튜디오 — 세션 정보 ==="
if [ -n "$NAME$DOMAIN$KEY" ]; then
  echo "브랜드: ${NAME:-(이름 미입력)} / 도메인: ${DOMAIN:-(미입력)} / 작업 강도: $RIGOR / 배포 브랜치: $PROD"
else
  echo "[안내] project.yaml 이 비어 있습니다. /start 로 사이트 정보를 먼저 채우세요."
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BRANCH="$(git symbolic-ref --short -q HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  DIRTY="$(git status --porcelain 2>/dev/null | grep -c .)"
  echo "현재 브랜치: ${BRANCH:-?} / 커밋 안 된 변경: ${DIRTY}개"
  if [ "$BRANCH" = "$PROD" ]; then
    echo "[주의] 지금 배포 브랜치($PROD)에 있습니다. 여기서 push 하면 실제 배포됩니다. 작업은 별도 브랜치에서 하세요."
  fi
  COMMITS="$(git log --oneline -3 2>/dev/null)"
  if [ -n "$COMMITS" ]; then
    echo "최근 커밋:"
    printf '%s\n' "$COMMITS" | sed 's/^/  /'
  fi
else
  echo "[안내] git 저장소가 아닙니다. 커밋·push 검사는 동작하지 않습니다."
fi

STATE="production/session-state/active.md"
if [ -f "$STATE" ]; then
  echo ""
  echo "--- 지난 체크포인트 ($STATE) ---"
  sed -n '/<!-- CHECKPOINT -->/,/<!-- \/CHECKPOINT -->/p' "$STATE" | grep -v 'CHECKPOINT -->' | head -30
  # 체크포인트가 마지막 커밋보다 1시간 이상 오래됐으면 알린다.
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    LAST_COMMIT="$(git log -1 --format=%ct 2>/dev/null)"
    STATE_TIME="$(date -r "$STATE" +%s 2>/dev/null || stat -c %Y "$STATE" 2>/dev/null)"
    if [ -n "$LAST_COMMIT" ] && [ -n "$STATE_TIME" ] && [ $((LAST_COMMIT - STATE_TIME)) -gt 3600 ]; then
      echo "[주의] 체크포인트가 마지막 커밋보다 오래됐습니다. 내용이 실제 상태와 다를 수 있으니 git log 로 확인하세요."
    fi
  fi
else
  echo ""
  echo "[안내] 체크포인트가 없습니다. 작업 중간과 끝에 /handoff 로 남기세요."
fi
exit 0
