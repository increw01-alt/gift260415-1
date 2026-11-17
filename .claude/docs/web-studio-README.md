# 웹 스튜디오 키트 v1

Claude Code 를 사이트 제작·운영팀처럼 쓰기 위한 프로젝트 템플릿.
게임 제작용 템플릿 [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
(MIT License, 2026-11-09 커밋 기준으로 확인)의 **구조**를 가져와 상담형 사이트·랜딩페이지·SEO·자동화 업무에 맞게 새로 쓴 것이다.
원본의 파일을 복사한 것은 없다.

## 한눈에 보기

```
재욱님(감독) ── 팀장: Claude Code ──┬── 직원: Codex (구현, AGENTS.md)
                                   └── 검수자 5명 (.claude/agents, 읽기 전용)
```

- 에이전트는 49명이 아니라 **검수자 5명**만 둔다. 구현은 다른 모델(Codex)이 하고 Claude 쪽이 검수하므로
  "같은 모델이 자기 결과를 보는" 검수를 피한다.
- 기본 강도는 `minimal`. 문서는 필요할 때 한 장만 쓴다.
- 지켜야 하는 규칙은 부탁이 아니라 **훅과 권한 규칙**으로 강제한다.

## 설치

WSL Ubuntu 터미널 기준. 이미 있는 파일은 덮어쓰지 않는다.

```bash
# 1) 미리 보기 (아무것도 바꾸지 않음)
bash ~/tools/web-studio-kit/install.sh ~/projects/<사이트폴더> --dry-run
# 2) 설치
bash ~/tools/web-studio-kit/install.sh ~/projects/<사이트폴더>
# 3) 그 폴더에서 Claude Code 시작 후 온보딩
cd ~/projects/<사이트폴더> && claude
/start
```

- 필요한 것: `git`, `python3`, `bash`. `jq` 는 있으면 좋다 (없으면 python3 로 대체).
- `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json` 이 이미 있으면 `*.web-studio.*` 이름으로 옆에 두고
  합치는 방법을 화면에 알려 준다.
- 반드시 **프로젝트 루트에서** `claude` 를 시작한다. 하위 폴더에서 시작하면 훅과 권한 규칙이 적용되지 않는다.
- Windows 에서 WSL 없이 쓰려면 Git for Windows(Git Bash)가 있어야 훅이 실행된다.

## 들어 있는 것

| 위치 | 내용 |
|---|---|
| `CLAUDE.md` | 팀 구조, 승인 범위, 브랜드 분리, 검증 원칙 |
| `AGENTS.md` | Codex(직원) 규칙과 완료 보고 형식 |
| `project.yaml` | 이 사이트의 브랜드·도메인·상담 링크·분석 ID·배포 브랜치·작업 강도 |
| `.claude/brands.tsv` | 브랜드별 도메인·대표번호 표 (브랜드 분리 검사용) |
| `.claude/agents/` | 검수자 5명 |
| `.claude/skills/` | 슬래시 명령 7개 |
| `.claude/hooks/` | 훅 4개 + 공용 함수 |
| `.claude/scripts/` | `site-check.py` (정적 점검), `cfg.sh` (설정 읽기) |
| `.claude/rules/` | 파일 종류별 규칙 3개 (HTML, 자동화 코드, 콘텐츠) |
| `.claude/docs/` | 작업 강도, 조율 규칙, 템플릿 3개 |
| `production/` | 체크포인트, 기획서, Codex 지시문, 세션 로그 |

### 명령

| 명령 | 하는 일 |
|---|---|
| `/start` | 저장소를 읽어 `project.yaml` 을 채우고 첫 체크포인트를 만든다 |
| `/brief` | 1장 기획서 → `production/briefs/` |
| `/delegate` | Codex 용 완성형 지시문 → `production/tasks/`, 결과 검수 절차 |
| `/site-check` | 정적 점검 실행과 해석 |
| `/review` | 변경 내용에 맞는 검수자를 병렬 호출하고 종합 |
| `/handoff` | 체크포인트 갱신 |
| `/launch` | 배포 전 최종 점검과 승인 요청 |

### 검수자

| 이름 | 보는 것 |
|---|---|
| `conversion-reviewer` | 첫 화면, CTA, 흐름, 신뢰 요소, 폼 |
| `seo-reviewer` | title·meta·헤딩·canonical·JSON-LD·내부 링크·sitemap (구글·네이버) |
| `qa-tester` | 경로, 폼, 반응형, 접근성, 임시값, 빌드 |
| `policy-reviewer` | 보장·과장 표현, 광고 정책 위험 문구, 개인정보 동의, 사업자 정보 |
| `tech-reviewer` | 변경 범위, 기존 기능·분석 코드 보존, 비밀정보, 성능, 자동화 코드 |

모두 `model: inherit` 이라 세션 모델을 그대로 쓴다 (특정 모델을 강제로 부르지 않는다).

### 훅

| 훅 | 언제 | 동작 |
|---|---|---|
| `session-start.sh` | 세션 시작·재개·압축 직후 | 브랜드·강도·브랜치·미커밋 수·체크포인트를 컨텍스트에 넣는다. 배포 브랜치에 있으면 경고 |
| `validate-commit.sh` | `git commit` 직전 | `.env`·키 파일·토큰 값이 있으면 **차단**. HTML 점검 오류와 배포 브랜치 직접 커밋은 경고 |
| `validate-push.sh` | `git push` 직전 | 강제 push 는 **차단**. 배포 브랜치 push 는 사람의 **승인 창을 강제로** 띄운다 |
| `session-stop.sh` | 응답이 끝날 때마다 | 체크포인트가 바뀌었을 때만 `production/session-logs/` 에 기록 |

`settings.json` 의 권한 규칙도 함께 건다: 모든 `git push` 는 확인(ask),
강제 push·`git reset --hard`·`git clean -f`·`rm -rf`·`.env` 읽기와 수정은 거부(deny).
`rm -rf` 가 막혀 빌드 폴더를 지우지 못하면 재욱님이 직접 지우거나 해당 규칙을 조정한다.

### 점검 스크립트

```bash
python3 .claude/scripts/site-check.py            # 전체
python3 .claude/scripts/site-check.py --files a.html b.html
python3 .claude/scripts/site-check.py --strict   # 오류가 있으면 종료 코드 1
python3 .claude/scripts/site-check.py --json
```

| 등급 | 항목 |
|---|---|
| 오류 | 깨진 로컬 경로, title 없음, H1 0개 또는 2개 이상, JSON-LD 문법 오류, 비밀정보로 보이는 값 |
| 경고 | lang·description·viewport·canonical·Open Graph 누락, alt 없음, 헤딩 건너뜀, 없는 앵커, 폼의 개인정보 동의·처리방침 링크, 등록값과 다른 추적 ID, 다른 브랜드 도메인·대표번호, robots.txt·sitemap.xml 없음 |
| 참고 | 본문 글자 수, 이미지 크기 미지정, 플레이스홀더·TODO 잔존, 미등록 추적 ID, 404.html, 사업자 정보 문구 |

스크립트는 관찰만 한다. 소스만 읽으므로 **실제 화면, 모바일 렌더링, 폼 전송, 콘솔 오류, 외부 링크의 생사는 보지 못한다.**

## 원본과의 대응

| 원본 (게임 스튜디오) | 이 키트 | 바꾼 이유 |
|---|---|---|
| 감독 3 → 팀장 → 실무자, 에이전트 49 | 재욱님 → 팀장(Claude Code) → 직원(Codex) + 검수자 5 | 구현과 검수를 다른 모델로 나눠 독립성을 얻는다 |
| 질문 → 선택지 → 결정 → 초안 → 승인 (매 작업) | 되돌리기 어려운 결정에만 적용 | 사소한 선택까지 물으면 느려진다 |
| `modes.rigor` minimal·standard·full | 그대로. 작업 종류를 웹 업무로 정의 | 원본도 minimal 이 기본 |
| `production/session-state/active.md` + CHECKPOINT 구역 | 그대로 | 파일이 기억이라는 원칙 |
| 훅 스크립트 18개 (게임 에셋·GDD 검사 포함) | 훅 4개 (세션 시작·종료, 커밋, push) | 웹 업무에 필요한 것만 |
| "스크립트는 관찰만, 판정하지 않는다" | 그대로 (`site-check.py`) | 판단은 팀장이 한다 |
| 게임 엔진·장르·에셋 파이프라인 | 없음 | 해당 없음 |
| 없음 | 브랜드 분리 검사, 추적 ID 대조, 개인정보 동의 검사 | 다중 브랜드 운영에 필요 |

## 손볼 곳

- `.claude/brands.tsv`: 도메인을 아는 브랜드만 들어 있다. 빠진 브랜드와 대표번호는 줄을 추가한다.
- `project.yaml` 의 `analytics`: 실제 ID 를 넣으면 "다른 ID 가 섞였는지" 검사가 켜진다.
- 검수 기준을 바꾸려면 `.claude/agents/*.md` 의 "점검 기준"을 고친다.
- 검수자와 명령을 모든 프로젝트에서 쓰려면 `.claude/agents/`, `.claude/skills/` 를 `~/.claude/` 아래로 옮긴다.
  훅과 `project.yaml` 은 프로젝트마다 둔다.

## 확인된 것과 확인되지 않은 것

- 확인: 훅 4개에 모의 입력을 넣어 통과·경고·차단·승인 요청 동작, 점검 스크립트의 각 항목, 설치 스크립트의 덮어쓰기 방지.
- 확인 못 함: 실제 Claude Code 세션 안에서의 훅 발동, 슬래시 명령과 검수자 호출. 처음 설치한 뒤
  `/start` 와 `git commit` 한 번으로 훅 메시지가 보이는지 확인한다. 훅 형식은 Claude Code 공식 문서(2026-11-17 확인) 기준이다.
