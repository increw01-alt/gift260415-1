#!/bin/bash
# PreToolUse(Bash) 훅 — git commit 직전에만 일한다.
#   차단(종료 코드 2): 비밀정보 파일(.env, 키 파일 등)이나 키·토큰으로 보이는 값이 커밋에 포함될 때
#   경고(종료 코드 0): HTML 점검 오류, 배포 브랜치에 직접 커밋
# 차단 사유는 stderr 로 내보내며 Claude 가 그 글을 읽고 스스로 고친다.

. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
INPUT="$(cat)"

# git commit 이 아닌 명령은 바로 통과 (이 훅은 모든 Bash 호출에서 실행된다)
case "$INPUT" in *git*commit*) ;; *) exit 0 ;; esac
CMD="$(printf '%s' "$INPUT" | ws_command)"
printf '%s' "$CMD" | grep -Eq '(^|[;&|(]|[[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+commit([[:space:]]|$)' || exit 0

cd "$WS_ROOT" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# 이번 커밋에 들어갈 파일. 같은 명령 안에 git add 나 commit -a 가 있으면
# 아직 스테이징되지 않은 변경·새 파일도 포함해서 본다.
FILES="$(git -c core.quotepath=false diff --cached --name-only --diff-filter=ACMR 2>/dev/null)"
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+add([[:space:]]|$)|commit[^;&|]*[[:space:]]-[A-Za-z]*a[A-Za-z]*([[:space:]]|$)|commit[^;&|]*--all'; then
  MORE="$(git -c core.quotepath=false ls-files -m -o --exclude-standard 2>/dev/null)"
  FILES="$(printf '%s\n%s\n' "$FILES" "$MORE" | grep . | sort -u)"
fi
[ -z "$FILES" ] && exit 0

# 1) 비밀정보 파일 이름
BAD_FILES=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="${f##*/}"
  case "$base" in
    .env.example|.env.sample|.env.template) ;;
    .env|.env.*|*.pem|*.p12|*.pfx|*.key|*.jks|*.keystore|id_rsa|id_ed25519|*service-account*.json|*credentials*.json)
      BAD_FILES="${BAD_FILES}  - ${f}
" ;;
  esac
done <<EOF
$FILES
EOF

# 2) 키·토큰으로 보이는 값
PY="$(ws_python)"
SECRET_OUT=""
if [ -n "$PY" ]; then
  SECRET_OUT="$(printf '%s\n' "$FILES" | "$PY" "$WS_ROOT/.claude/scripts/site-check.py" --root "$WS_ROOT" --secrets-only --files-from - 2>/dev/null)"
else
  SECRET_OUT="$(printf '%s\n' "$FILES" | while IFS= read -r f; do
    [ -f "$f" ] && grep -EnI -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' -e 'AKIA[0-9A-Z]{16}' -e 'gh[pousr]_[A-Za-z0-9]{36,}' "$f" 2>/dev/null | cut -d: -f1 | sed "s|^|  - $f:|"
  done)"
fi

if [ -n "$BAD_FILES" ] || [ -n "$SECRET_OUT" ]; then
  {
    echo "커밋 차단: 비밀정보가 커밋에 포함되려 합니다."
    [ -n "$BAD_FILES" ] && { echo "비밀정보 파일:"; printf '%s' "$BAD_FILES"; }
    [ -n "$SECRET_OUT" ] && { echo "키·토큰으로 보이는 값:"; printf '%s\n' "$SECRET_OUT"; }
    echo "조치: 해당 파일을 스테이징에서 빼고(git restore --staged <파일>) .gitignore 에 추가하세요."
    echo "값은 코드에 넣지 말고 환경변수 또는 GitHub Secrets / Cloudflare 환경변수로 옮기세요."
    echo "오탐이면 재욱님에게 해당 줄을 보여 주고 판단을 받으세요. 훅을 우회하지 마세요."
  } >&2
  exit 2
fi

# 3) 경고 (막지 않음)
NOTES=""
PROD="$(ws_cfg deploy.production_branch)"; [ -z "$PROD" ] && PROD="main"
BRANCH="$(git symbolic-ref --short -q HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$BRANCH" = "$PROD" ]; then
  NOTES="${NOTES}배포 브랜치($PROD)에 직접 커밋하고 있습니다. push 하면 곧바로 실제 배포됩니다.
"
fi
if [ -n "$PY" ] && printf '%s\n' "$FILES" | grep -Eiq '\.html?$'; then
  HTML_ERR="$(printf '%s\n' "$FILES" | "$PY" "$WS_ROOT/.claude/scripts/site-check.py" --root "$WS_ROOT" --files-from - --errors-only --max 8 2>/dev/null | grep -E '^\[오류\]|^  ')"
  if [ -n "$HTML_ERR" ]; then
    NOTES="${NOTES}커밋할 HTML 에 점검 오류가 있습니다. 고친 뒤 커밋하는 것이 좋습니다.
${HTML_ERR}
"
  fi
fi
[ -n "$NOTES" ] && ws_warn "[커밋 전 점검] ${NOTES}"
exit 0
