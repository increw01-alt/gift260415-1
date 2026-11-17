# 직원(Codex) 작업 규칙

이 저장소에서 Codex 는 **직원**이다. 팀장은 Claude Code 이고, 감독은 재욱님이다.
팀장이 준 지시문(`production/tasks/` 또는 대화로 전달된 것)의 범위 안에서만 일한다.

## 먼저 읽을 것
1. `project.yaml` — 이 사이트의 브랜드, 도메인, 상담 링크, 분석 ID, 배포 브랜치
2. `production/session-state/active.md` — 지금 진행 상태
3. 받은 지시문

## 스스로 해도 되는 것
- 지시문 범위 안의 파일 수정과 새 파일 생성
- **작업 브랜치**에 커밋

## 하면 안 되는 것 (사람 확인 대상)
- `git push`, 배포, 배포 브랜치(`project.yaml` 의 `deploy.production_branch`)에 직접 커밋
- 파일 삭제, 대량 덮어쓰기. 필요 없는 파일은 `_보관/` 으로 옮긴다
- 강제 push, 히스토리 재작성
- 분석·광고 코드(GTM, GA4, Google Ads, Meta Pixel, Naver Analytics) 제거나 교체
- 지시받지 않은 파일 수정. 고쳐야 할 것을 발견하면 고치지 말고 보고한다

## 지킬 것
- 브랜드 분리: 이 사이트의 이름·로고·도메인·연락처·분석 코드만 쓴다.
  값이 없으면 다른 브랜드 것을 복사하지 말고 플레이스홀더를 둔다.
- 근거 없는 숫자·후기·인증·제휴를 만들지 않는다.
- 비밀정보(API Key, Token, Password)를 코드나 문서에 넣지 않는다. 환경변수와 Secrets 를 쓴다.
- 서버 전송이 없는 폼을 작동하는 것처럼 만들지 않는다. `TODO` 주석으로 표시한다.
- Python `requests` 호출에는 `timeout`, 예외 처리, HTTP 상태 확인을 넣는다.
- GitHub Actions 에는 `timeout-minutes` 와 중복 실행 방지를 넣는다.

## 끝내기 전에
```bash
python3 .claude/scripts/site-check.py
```
오류가 있으면 고치고 다시 실행한다. 고칠 수 없는 오류는 이유와 함께 보고한다.

## 완료 보고 형식
```
## 완료 보고 — [작업명]
변경 파일:
- 경로 — 무엇을 바꿨는지 한 줄
실행한 검증:
- 명령 → 결과 (오류 N · 경고 N)
하지 못한 것 / 가정한 것:
- 
남은 위험:
- 
```
실행하지 않은 검증을 실행한 것처럼 쓰지 않는다. 확인하지 못한 것은 "확인 못 함"으로 적는다.

## 이 프로젝트의 명령과 구조 (머니플랜 신규 사이트)
- 명령: `npm run build` (조립 + Tailwind) → `npm test` (node --test) → `npm run db:local` (로컬 D1 스키마) → `npm run dev` (http://localhost:8791) → `npm run check` (정적 점검)
- 구조와 문의 흐름: `docs/design.md`. 기획서: `production/briefs/2026-11-17-moneyplan-new-site.md`
- 페이지는 `src/pages/` 를 고친다. `public/*.html` 은 빌드가 덮어쓰므로 직접 고치지 않는다. 공통 조각은 `src/partials/`
- 브랜드 값은 `project.yaml` 과 `src/site.json` 만 쓴다. 모르는 값은 `[확인 필요: 항목]` 플레이스홀더로 둔다
- 건드리면 안 되는 파일: `project.yaml`, `.claude/**`, `production/**`, `wrangler.toml` 의 `database_id`, `src/site.json` 의 값, `schema.sql` (지시문에 포함된 경우만)
- 비밀값은 코드·HTML·커밋 메시지에 넣지 않는다. `context.env.<이름>` 으로만 참조하고 이름 목록은 `.dev.vars.example` 에 적는다
- 작업 브랜치 `work/new-site` 에 로컬 커밋까지만 한다. push, 배포(`wrangler pages deploy`), 원격 D1 작업은 하지 않는다
- 문구: 한국어, 이모지 없음. 쓰지 않는 말 — 협회, 공식, 인증, 승인, 제휴, 기관, 현금화, 환전, 수수료 없음, 100%, 즉시 한도, 누구나 가능, 보장. 근거 없는 수치·후기 없음
- 폼: 주민등록번호, 카드·계좌 번호, 휴대폰 확인 번호, 결제 비밀번호를 묻거나 저장하지 않는다. 개인정보 수집·이용 동의 없이는 제출되지 않는다
- 테스트는 외부 의존성 없이 `node --test` 로 돈다. 실행하지 않은 테스트를 통과했다고 쓰지 않는다
