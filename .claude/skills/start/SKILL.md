---
name: start
description: "처음 한 번 실행하는 온보딩. 저장소를 살펴 사이트 정보를 추정하고 project.yaml 을 채운 뒤 체크포인트 파일을 만든다."
argument-hint: "[브랜드명 또는 도메인]"
user-invocable: true
---

# /start — 사이트 정보 채우기

목표: `project.yaml` 을 실제 값으로 채우고, 첫 체크포인트를 만든다.
질문은 **한 번에 모아서** 한다. 저장소에서 알아낼 수 있는 것은 묻지 않는다.

## 1. 저장소에서 알아내기 (묻기 전에)

아래를 직접 읽어서 추정한다.

- 사이트 유형: `package.json`, `vite.config.*`, `next.config.*`, `astro.config.*` 가 있으면 해당 유형, 없으면 `static`
- HTML 위치(`site.root`): `index.html` 이 있는 폴더
- 도메인: `CNAME`, `<link rel="canonical">`, `sitemap.xml`, `og:url`
- 브랜드명: `<title>`, `og:site_name`, 푸터의 상호
- 대표번호: `tel:` 링크
- 상담 링크: `channel.io` 가 들어간 링크, 또는 "상담" 문구가 붙은 CTA 의 주소
- 분석 ID: HTML 안의 `GTM-…`, `G-…`, `AW-…`, `fbq('init', …)`
- 배포 브랜치: `git remote show origin` 의 HEAD branch 또는 `git branch -r`
- 빌드 명령·출력 폴더: `package.json` 의 scripts, `wrangler.toml`, README
- 브랜드 key: 추정한 도메인을 `.claude/brands.tsv` 에서 찾는다

## 2. 한 번에 확인받기

추정한 값을 표로 보여 주고 이렇게 묻는다.

- 맞으면 "그대로"라고 답하면 된다는 것
- 추정하지 못한 항목 목록 (빈칸으로 둘지, 값을 줄지)
- `.claude/brands.tsv` 에 이 사이트 도메인이 없으면 줄을 추가해도 되는지

**추정하지 못한 값은 비워 둔다.** 다른 브랜드 값을 가져오거나 그럴듯한 값을 지어내지 않는다.
인자로 브랜드명이나 도메인을 받았으면 그것을 기준으로 삼는다.

## 3. 기록

1. `project.yaml` 의 해당 키만 고친다. 주석과 구조는 그대로 둔다. 2단계 구조(섹션 아래 키)를 유지한다.
2. `production/session-state/active.md` 가 없으면
   `.claude/docs/templates/session-state.md` 를 복사해 만들고 CHECKPOINT 를 현재 상태로 채운다.
3. `.gitignore` 에 `production/session-logs/` 와 `.env` 가 없으면 추가를 제안한다.
4. 확인: `bash .claude/scripts/cfg.sh brand.name` 과 `python3 .claude/scripts/site-check.py` 를 실행해
   설정이 읽히는지, 지금 사이트 상태가 어떤지 본다.

## 4. 마무리 보고

- 채운 값과 비워 둔 값
- 현재 점검 결과 요약 (오류 N · 경고 N)
- 작업 강도(`modes.rigor`) 현재값과 바꾸는 방법 한 줄
- 다음에 할 일 제안 1개 (예: 오류 N건 수정, `/brief` 로 신규 페이지 시작)
