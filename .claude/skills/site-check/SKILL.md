---
name: site-check
description: "정적 사이트 점검 스크립트를 실행하고 결과를 해석해 고칠 것을 정한다. HTML 을 수정한 뒤, 커밋 전, 배포 전에 쓴다."
argument-hint: "[파일 경로...]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Edit, Bash(python3 .claude/scripts/site-check.py), Bash(python3 .claude/scripts/site-check.py *)
---

# /site-check — 정적 점검

## 실행

```bash
python3 .claude/scripts/site-check.py                 # 사이트 전체
python3 .claude/scripts/site-check.py --files a.html  # 인자로 받은 파일만
```

스크립트는 **관찰만** 한다. 무엇을 고칠지는 아래 기준으로 팀장이 판단한다.

## 결과 해석

| 등급 | 처리 |
|---|---|
| 오류 | 바로 고친다. 깨진 경로, title 없음, H1 개수, JSON-LD 문법, 비밀정보 |
| 경고 | 하나씩 판단한다. 아래 표 참고 |
| 참고 | 배포 전 목록으로만 정리한다 |

경고 판단 기준

| 경고 | 판단 |
|---|---|
| 다른 브랜드 도메인 언급 | 네트워크 내부 링크나 상담 유입용 링크면 정상. 로고·문구·연락처가 섞인 것이면 고친다 |
| 추적 ID 불일치 | 고치지 말고 재욱님에게 보고한다. 분석 코드는 요청 없이 바꾸지 않는다 |
| 폼 동의 체크박스·처리방침 링크 없음 | 추가한다. 처리방침 페이지가 없으면 링크 자리에 `TODO` 주석을 두고 보고한다 |
| meta·canonical·OG 누락 | 추가한다. 값은 그 페이지 내용에서 만든다 |
| 헤딩 건너뜀·alt 누락 | 고친다 |
| robots.txt·sitemap.xml 없음 | 만든다. 도메인은 `project.yaml` 기준 |

## 고친 뒤

1. 다시 실행해서 오류가 0건인지 확인한다.
2. 고친 것과 남긴 것(이유 포함)을 짧게 보고한다.
3. 스크립트가 **보지 못하는 것**을 함께 알린다: 실제 화면 표시, 모바일 렌더링, 폼 전송, 콘솔 오류, 외부 링크의 생사.
   필요하면 `/review` 로 검수자에게 맡긴다.

`site.type` 이 `static` 이 아니면 경로 판정이 정확하지 않을 수 있다 (라우팅을 알 수 없으므로 깨진 경로가 경고로 나온다).
이때는 빌드 결과물 폴더를 기준으로 한 번 더 확인한다.
