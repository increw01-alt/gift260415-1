---
paths:
  - "**/*.py"
  - ".github/workflows/**"
  - "workers/**"
  - "functions/**"
---

# 자동화 코드 규칙

- 동적 기능(크롤링·시세 수집·API)은 Cloudflare Workers·GitHub Actions 를 먼저 검토한다
- Python `requests` 는 모든 호출에 `timeout` (예: `timeout=10`), `try/except`, HTTP 상태 확인을 넣는다.
  필요하면 재시도와 오류 로그를 둔다
- GitHub Actions 는 `timeout-minutes` 필수 (cron 작업은 10 을 기준으로), `concurrency` 로 중복 실행 방지,
  값은 Secrets 로 받는다. 실패했을 때 어디를 보면 되는지 주석이나 README 에 적는다
- 비공개 저장소의 잦은 cron 은 과금 위험이 있다. 실행 간격을 정하기 전에 저장소 공개 여부를 확인한다
- 비밀정보(API Key, Token, Secret, Password, Private Key)는 코드·README·로그에 넣지 않는다.
  환경변수 또는 Secrets 를 쓰고 `.env` 는 커밋하지 않는다
- 크롤링·API 호출은 robots.txt, 호출 제한, 약관을 확인하고 호출 간격을 둔다
- 원본 데이터는 그대로 두고 사본에서 작업한다. 합계와 건수를 검산한다
- 실행해 보지 않은 스크립트를 "동작 확인됨"이라고 쓰지 않는다
