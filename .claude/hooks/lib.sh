#!/bin/bash
# 훅 공용 함수. 각 훅이 source 해서 쓴다. 단독 실행하지 않는다.

# 프로젝트 루트: Claude Code 가 넘겨 준 CLAUDE_PROJECT_DIR 우선, 없으면 이 파일 위치 기준.
ws_root() {
  local r="${CLAUDE_PROJECT_DIR:-}"
  if [ -z "$r" ] || [ ! -d "$r/.claude" ]; then
    r="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)"
  fi
  printf '%s' "$r"
}
WS_ROOT="$(ws_root)"

# project.yaml 값 읽기: ws_cfg brand.name
ws_cfg() {
  bash "$WS_ROOT/.claude/scripts/cfg.sh" "$1" "$WS_ROOT/project.yaml" 2>/dev/null
}

# 쓸 수 있는 파이썬 실행 파일 이름 (없으면 빈 문자열)
ws_python() {
  local c
  for c in python3 python py; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)' >/dev/null 2>&1; then
      printf '%s' "$c"; return 0
    fi
  done
  return 1
}

# stdin 의 훅 JSON 에서 tool_input.command 를 꺼낸다. 못 꺼내면 빈 문자열.
ws_command() {
  local py
  if command -v jq >/dev/null 2>&1; then
    jq -r '.tool_input.command // empty' 2>/dev/null
  elif py="$(ws_python)"; then
    "$py" -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("command","") or "")
except Exception:
    pass' 2>/dev/null
  else
    cat >/dev/null
  fi
}

# 문자열을 JSON 문자열 리터럴(따옴표 포함)로 바꾼다.
ws_json_str() {
  local py
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -Rs '.'
  elif py="$(ws_python)"; then
    printf '%s' "$1" | "$py" -c 'import json,sys; sys.stdout.write(json.dumps(sys.stdin.read(), ensure_ascii=False))'
  else
    printf '"%s"' "$(printf '%s' "$1" | tr '\n\t' '  ' | sed 's/\\/\\\\/g; s/"/\\"/g')"
  fi
}

# 경고만 하고 통과시킨다 (사람에게는 systemMessage, Claude 에게는 additionalContext).
ws_warn() {
  local m; m="$(ws_json_str "$1")"
  printf '{"systemMessage":%s,"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":%s}}\n' "$m" "$m"
}

# 사람의 승인 창을 강제로 띄운다.
ws_ask() {
  local m; m="$(ws_json_str "$1")"
  printf '{"systemMessage":%s,"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":%s}}\n' "$m" "$m"
}
