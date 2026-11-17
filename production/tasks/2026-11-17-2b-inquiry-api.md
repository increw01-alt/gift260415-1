# Codex 작업 지시문 — 2B. 문의 접수 API(Pages Functions), D1 저장, 빈도 제한

작성: 2026-11-17 / 작성자: 팀장(Claude Code)

## 목적
문의 폼이 보낸 요청을 검증하고 D1 `inquiries` 에 저장하는 `POST /api/inquiry` 를 만든다. 같은 발신자의 과도한 요청은 D1 `rate_limits` 로 막는다.

## 현재 상황
2A 에서 `functions/lib/validate.js` (검증 순수 함수)가 들어왔다. `schema.sql` 에 `inquiries`, `rate_limits` 테이블이 정의되어 있고 로컬 D1 에 적용되어 있다. `wrangler.toml` 의 `[vars]` 에 `RATE_LIMIT_WINDOW_SEC`(600), `RATE_LIMIT_MAX`(5), `SITE_URL` 이 있다. 비밀값 `IP_HASH_SALT` 는 `context.env.IP_HASH_SALT` 로 읽는다(없으면 빈 문자열로 동작하되 실패하지 않는다).

## 프로젝트 위치
- 경로: 이 저장소 루트
- 브랜치: `work/new-site`

## 대상 파일
- 새로 만들기: `functions/api/inquiry.js`, `functions/lib/ratelimit.js`, `functions/lib/http.js`, `functions/lib/hash.js`, `tests/ratelimit.test.mjs`, `tests/inquiry-api.test.mjs`, `tests/helpers/fake-d1.mjs`
- 수정: 없음

## 스택
Cloudflare Pages Functions (ESM, Web 표준 API). 외부 패키지 없음. 해시는 `crypto.subtle.digest("SHA-256", …)`. 테스트는 `node:test` 로 돌며 Node 24 의 전역 `Request`/`Response`/`crypto.subtle` 을 쓴다.

## 만들 것
### `functions/lib/http.js`
```js
export function json(body, status = 200, headers = {})  // Response(JSON.stringify(body)), content-type: application/json; charset=utf-8, cache-control: no-store
export async function readBody(request) // content-type 이 application/json 이면 JSON, application/x-www-form-urlencoded 또는 multipart/form-data 면 formData → 평범한 객체. 그 외는 null
```
### `functions/lib/hash.js`
```js
export async function hashIp(ip, salt = "") // sha256(ip + "|" + salt) 의 16진수 앞 32자. ip 가 없으면 "unknown" 을 해시
```
### `functions/lib/ratelimit.js`
```js
export async function checkRateLimit(db, key, { windowSec, max, now = new Date() })
// 반환 { allowed: boolean, count: number, retryAfterSec: number }
// 동작: rate_limits 에서 key 조회. 행이 없거나 window_start + windowSec 가 now 보다 과거면 count=1, window_start=now 로 UPSERT 하고 allowed=true.
//       창 안이고 count < max 면 count+1 로 UPDATE 하고 allowed=true. count >= max 면 갱신하지 않고 allowed=false, retryAfterSec = 창이 끝날 때까지 남은 초.
// SQL 은 INSERT ... ON CONFLICT(key) DO UPDATE 를 써서 쿼리 2번(SELECT, UPSERT) 이내로 끝낸다.
```
### `functions/api/inquiry.js`
```js
export async function onRequestPost(context)
export async function onRequest(context) // POST 가 아니면 405 json({ ok:false, errors:{ _:"허용되지 않는 방법입니다" } }) 에 Allow: POST
```
처리 순서:
1. `readBody` 가 null 이면 415 `{ok:false, errors:{_:"지원하지 않는 형식입니다"}}`
2. `isHoneypotTripped(body)` 면 저장하지 않고 200 `{ok:true}` (봇에게는 성공처럼 보인다)
3. `validateInquiry(body)` 실패면 400 `{ok:false, errors}`
4. IP = `request.headers.get("CF-Connecting-IP")` (없으면 `X-Forwarded-For` 첫 값, 없으면 null). `ipHash = await hashIp(ip, env.IP_HASH_SALT)`
5. `checkRateLimit(env.DB, "inquiry:" + ipHash, { windowSec: Number(env.RATE_LIMIT_WINDOW_SEC) || 600, max: Number(env.RATE_LIMIT_MAX) || 5 })` 가 불허면 429 `{ok:false, errors:{_:"잠시 후 다시 시도해 주세요"}}` 에 `Retry-After` 헤더
6. `inquiries` 에 INSERT: type, name, contact, message, consent=1, page(요청 body 의 page 를 200자로 자른 문자열, 없으면 null), ip_hash, user_agent(헤더를 300자로 자름). `RETURNING id` 또는 `meta.last_row_id` 로 id 확보
7. 200 `{ok:true, id}`
8. 예외는 try/catch 로 잡아 500 `{ok:false, errors:{_:"문의 저장에 실패했습니다. 전화나 카카오톡으로 문의해 주세요"}}`. 오류 원문을 응답에 넣지 않고 `console.error` 에만 남긴다
알림 발송은 만들지 않는다 (수신 방식 미정). `// TODO(확인 필요): 알림 발송` 주석 한 줄만 둔다.

### `tests/helpers/fake-d1.mjs`
D1 의 `prepare(sql).bind(...args).first()/run()/all()` 을 흉내 내는 아주 작은 가짜. SQL 을 파싱하지 말고, `inquiries` 와 `rate_limits` 두 테이블에 대해 이 프로젝트가 실제로 쓰는 쿼리 형태(SELECT by key, INSERT ... ON CONFLICT ... DO UPDATE, INSERT inquiries ... RETURNING id)만 문자열 패턴으로 구분해 처리한다. 저장된 행을 테스트에서 볼 수 있게 `rows` 속성을 노출한다.

### 테스트
`tests/ratelimit.test.mjs`: 처음 요청 allowed·count 1 / max 번째까지 allowed / max+1 번째 불허·retryAfterSec > 0 / 창이 지나면 다시 count 1.
`tests/inquiry-api.test.mjs`: 정상 JSON 요청 → 200, id, fake rows 에 저장되고 ip 원문이 없고 ip_hash 가 32자 / form-urlencoded 요청도 200 / consent 없음 → 400 과 `errors.consent` / honeypot → 200 이지만 rows 비어 있음 / 6번째 요청 → 429 와 Retry-After / GET → 405 / text/plain → 415 / DB 가 throw 하면 500 과 오류 원문 미노출.

## 유지할 것
- `functions/lib/validate.js` 는 그대로 쓴다 (수정 금지)
- `schema.sql`, `wrangler.toml`, `src/**`, `public/**`, `project.yaml`, `.claude/**`, `production/**` 은 건드리지 않는다. 스키마가 부족하면 고치지 말고 보고한다

## 참고 자료
- 설계안: `docs/design.md` 3절 "API 계약", 4절 환경변수
- 스키마: `schema.sql`

## 수정 범위
위 "대상 파일" 7개만. 새 패키지를 추가하지 않는다.

## 금지 사항
- push, 배포, 원격 D1 작업, 삭제 (사람 확인 대상)
- 다른 브랜드의 이름·연락처·분석 코드 사용
- 비밀값을 코드·테스트·커밋 메시지에 넣기. 테스트에서 salt 는 `"test-salt"` 같은 가짜 문자열만
- IP 원문 저장, 오류 원문을 응답에 노출
- 지시받지 않은 파일 수정, 영어 사용자 메시지, 이모지

## 결과물 형식
- `work/new-site` 브랜치에 커밋 1개. 메시지: `2B: 문의 접수 API, D1 저장, 빈도 제한`
- `AGENTS.md` 의 완료 보고 형식으로 보고

## 검수 기준
팀장이 아래로 확인한다.
- [ ] `npm test` 통과 (2A 테스트 포함 전부)
- [ ] `git diff --stat <2A 커밋>` 이 대상 파일 7개만 포함
- [ ] `functions/` 아래에 `import` 되는 외부 패키지가 없다
- [ ] 응답 형식이 `docs/design.md` API 계약과 같다 (상태 코드 200/400/405/415/429/500, `ok`, `errors`)
- [ ] `npm run dev` 로 띄운 뒤 `curl -X POST http://localhost:8791/api/inquiry -H "content-type: application/json" -d '{...정상 입력...}'` 이 200 과 id 를 돌려주고, 로컬 D1 에 행이 생긴다 (팀장이 실행)

## 완료 조건
- [ ] 위 검수 기준 중 1~4번이 예 (5번은 팀장 실행)
- [ ] 완료 보고에 `npm test` 출력의 pass/fail 줄이 들어 있다
