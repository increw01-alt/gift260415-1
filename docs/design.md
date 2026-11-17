# 설계안 — 머니플랜 신규 사이트 (페이지 구조와 문의 흐름)

작성 2026-11-17 / 팀장. 기획서: `production/briefs/2026-11-17-moneyplan-new-site.md`

## 1. 구조
```
src/pages/**/*.html      페이지 원본. 맨 위 <!-- meta key: value --> 로 title·description·path 지정
src/partials/*.html      공통 조각: head(메타·폰트·CSS·GTM), header, footer, floating, bottombar
src/site.json            브랜드 값 한 곳 (전화, 채널톡 채팅 페이지 주소, GTM, 사업자 정보 플레이스홀더)
src/app.css              Tailwind v4 진입점 + 디자인 토큰 + 공통 컴포넌트 클래스
scripts/build-pages.mjs  조립기: include 치환 + {{값}} 치환 → public/
public/                  배포 산출물. *.html 은 빌드가 덮어쓰므로 직접 고치지 않는다. css/app.css 는 커밋하지 않는다
public/js/common.js      모바일 메뉴, 하단 바 여백, 문의 유형 미리 선택, CTA dataLayer 이벤트
functions/api/inquiry.js Pages Function: POST /api/inquiry (2단계, Codex)
functions/lib/validate.js 순수 검증 함수 (2단계, Codex) — 브라우저와 서버가 같은 규칙을 쓰도록 의존성 없음
functions/lib/ratelimit.js D1 기반 빈도 제한 (2단계, Codex)
tests/*.test.mjs         node --test 단위 테스트
schema.sql               D1 스키마 (inquiries, rate_limits)
docs/image-prompts.md    이미지 생성 프롬프트 (4단계)
docs/copy.md             주요 문구와 금지 표현 점검 결과 (3·5단계)
```
명령: `npm run build` → `npm test` → `npm run db:local` → `npm run dev` (http://localhost:8791) → `npm run check`

## 2. 페이지와 URL
| URL | 파일 | 역할 | 주요 CTA |
|---|---|---|---|
| `/` | `src/pages/index.html` | 메인. Hero → 결제수단·상품권 요약 → 이용 흐름 3단계 → FAQ 3개 → 문의 배너 | 휴대폰결제 문의, 소액결제 문의, 전화 |
| `/guide/` | `guide/index.html` | 상품권 종류별·결제수단별 구입 안내, 준비할 것 | 문의 폼(유형 미리 선택) |
| `/mobile-payment/` | `mobile-payment/index.html` | 휴대폰결제·소액결제 구입 문의 안내: 언제 쓰는지, 진행 순서, 유의사항(통신사 한도·연체 시 제한) | `/contact/?type=mobile-payment`, `?type=micro-payment` |
| `/faq/` | `faq/index.html` | 구입·결제·수령·취소 4묶음 아코디언(`<details>`) | 문의 폼 |
| `/how-to/` | `how-to/index.html` | 문의부터 수령까지 흐름, 운영시간, 응답 방식 | 전화·채팅 상담·폼 |
| `/contact/` | `contact/index.html` | 문의 폼 + 전화·채팅 상담(채널톡) 안내 | 제출 |
| `/privacy/` | `privacy/index.html` | 개인정보처리방침. 수집 항목은 폼과 일치(유형·이름 또는 닉네임·연락처·문의 내용·접속 기록) | — |
| `/terms/` | `terms/index.html` | 이용약관 | — |
공통: 헤더(로고 자리·메뉴·문의하기 버튼), 푸터(사업자 정보·정책 링크), 플로팅 버튼, 모바일 하단 바(전화·채팅 상담·문의하기), GTM 1회.
`sitemap.xml`, `robots.txt`, `404.html`, `favicon.svg`, `images/og-image.png`(이미지 자리) 는 `public/` 에 정적으로 둔다.

## 3. 문의 흐름
```
[어느 페이지의 문의 CTA] --새 창--> [채널톡 채팅 페이지]   (문의 폼은 하단 바 '문의 폼'·퀵바 '문의 폼'·푸터 링크로만 진입)
[문의 폼 /contact/?type=…] --POST /api/inquiry (JSON)--> [검증] --> [빈도 제한] --> [D1 inquiries INSERT] --> [완료 메시지]
                                                                      └ 실패 → 항목별 오류 메시지 (400) / 너무 잦은 요청 (429)
[전화 CTA] tel:1800-2434     [채팅 상담 CTA] 채널톡 채팅 페이지 링크 새 창 (site.json channel_url)
```
문의 유형 값: `mobile-payment` 휴대폰결제 구입 / `micro-payment` 소액결제 구입 / `voucher-type` 상품권 종류 문의 / `other` 기타.
2026-11-17 저녁 재욱님 결정: 메인·안내 페이지의 문의 CTA(휴대폰결제·소액결제 구입 문의, 문의하기, 헤더 버튼, 플로팅 버튼)는 모두 채널톡 채팅 페이지로 간다. 문의 폼은 보조 경로로 유지하며 `?type=` 미리 선택은 폼 링크에만 해당한다.

### API 계약 — `POST /api/inquiry`
요청(JSON 또는 form-urlencoded): `type`, `name`, `contact`, `message`, `consent`("on"|true|"1"), `website`(honeypot, 비어 있어야 함), `page`(선택).
응답: `200 {ok:true, id}` / `400 {ok:false, errors:{field: "메시지"}}` / `429 {ok:false, errors:{_: "잠시 후 다시 시도해 주세요"}}` / `405`, `415`, `500 {ok:false, errors:{_: "..."}}`.
저장: `inquiries` (schema.sql). IP 원문은 저장하지 않고 `sha256(ip + IP_HASH_SALT)` 앞 32자만 둔다. 알림 발송은 수신 방식이 정해질 때까지 `functions/lib/notify.js` 를 만들지 않는다(확인 필요 항목).

### 검증 규칙 (`functions/lib/validate.js`, 브라우저에서도 같은 함수를 `public/js/validate.js` 로 복사해 사용)
| 항목 | 규칙 | 오류 메시지 |
|---|---|---|
| type | 4개 값 중 하나 | 문의 유형을 선택해 주세요 |
| name | 공백 제거 후 1~30자 | 이름 또는 닉네임을 입력해 주세요 (30자 이내) |
| contact | 휴대폰 번호(01로 시작, 숫자 10~11자리, 하이픈·공백·점 허용) | 연락 가능한 휴대폰 번호를 입력해 주세요 |
| message | 공백 제거 후 10~1000자 | 문의 내용을 10자 이상 입력해 주세요 (1000자 이내) |
| message 민감정보 | 주민등록번호 형태(6자리-7자리), 카드번호 형태(연속 14~16자리) 가 있으면 거부 | 주민등록번호·카드번호·계좌번호는 적지 말아 주세요 |
| consent | true 가 아니면 거부 | 개인정보 수집·이용에 동의해야 문의를 보낼 수 있습니다 |
| website | 값이 있으면 조용히 200 (봇) | — |
빈도 제한: `rate_limits` 테이블, key `inquiry:<ip_hash>`, 창 `RATE_LIMIT_WINDOW_SEC`(600) 안에 `RATE_LIMIT_MAX`(5) 초과 시 429.

## 4. 환경변수 이름 (값은 코드에 넣지 않는다)
`IP_HASH_SALT`(secret), `RATE_LIMIT_WINDOW_SEC`, `RATE_LIMIT_MAX`, `SITE_URL`(wrangler.toml vars). 알림용 이름은 수신 방식 확정 후 추가.

## 5. 문구 규칙 (3단계에서 docs/copy.md 로 점검)
- 쓰지 않는 말: 협회, 공식, 인증, 승인, 제휴, 기관, 현금화, 현금 환전, 수수료 없음, 100%, 즉시 한도, 누구나 가능, 보장. 수치·후기·수상 없음.
- 쓰는 말: 상품권 구입 문의, 구입 안내, 결제수단 안내, 상담 후 안내, 통신사 한도 확인, 본인 명의 휴대폰.
- 수집하지 않는 것을 안내할 때도 금지어를 피한다. 예: "휴대폰으로 받은 확인 번호, 카드·계좌 번호, 주민등록번호는 묻지 않습니다".
- 검수 명령: `grep -rnE "협회|공식|인증|승인|제휴|현금화|환전|수수료 없|100%|즉시 한도|누구나" src/ public/*.html public/**/*.html`

## 6. 미루는 것 (구조만 대비)
회원·로그인(없음), 결제(없음), 관리자 화면(`inquiries.status` 열만 둠), 챗봇(없음), 알림(수신 방식 확정 후).

## 7. 운영 메모 (검수 반영, 2026-11-17)
- `IP_HASH_SALT` 가 없으면 `/api/inquiry` 는 500 을 돌려준다(약한 해시로 IP 복원 가능성을 막기 위해). 운영: `npx wrangler pages secret put IP_HASH_SALT --project-name moneyplan-site` (Production·Preview 둘 다). 로컬: `.dev.vars`.
- 보유 기간(답변 완료 후 1년, 확인 필요) 삭제 장치가 없다. 월 1회 수동 `DELETE FROM inquiries WHERE status='closed' AND created_at < date('now','-1 year')` 또는 별도 Worker Cron. `rate_limits` 도 `DELETE … WHERE window_start < …` 로 정리.
- `wrangler.toml` 에 `[env.preview]` 가 없어 프리뷰 배포가 운영 D1 을 공유한다. 프리뷰에서 보낸 테스트 문의는 수동 삭제하거나 별도 D1 을 둔다.
- 알림 발송은 미구현(수신 방식 미정). 운영자가 D1 을 조회하기 전까지는 문의가 들어온 것을 알 수 없다.
- 교차 출처 POST 는 403. 본문 16KB 초과 413. 잘못된 JSON 400.
- 빌드 산출물 중 `public/*.html` 은 커밋하고 `css/app.css`·`js/validate.js` 는 커밋하지 않는다. 커밋 전 `npm run build` 후 `git status` 가 깨끗해야 한다.
- 채널톡: SDK 를 넣지 않고 채팅 페이지 링크(koreagiftcard.channel.io/home?page=머니플랜)를 새 창으로 연다. 클릭 시 dataLayer channeltalk_open 만 보낼 수 있고, 상담 시작·연락처 입력(qualify_lead·close_convert_lead)은 채널톡 안에서 일어나 사이트가 알 수 없다 → 이 두 전환은 문의 폼 접수에서만 발생한다. 전화 클릭은 phone_click.
