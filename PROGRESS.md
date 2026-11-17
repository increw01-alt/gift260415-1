# PROGRESS — 머니플랜 신규 사이트

브랜치 `work/new-site`. 로컬 커밋만. push·배포는 재욱님 확인 후.

## 완료
| 날짜 | 단계 | 내용 |
|---|---|---|
| 2026-11-17 | 0 | 키트 설치, project.yaml(강도 full), 기획서·리다이렉트 표·원 지시문 반입 |
| 2026-11-17 | 1 | AGENTS.md 보강, PROGRESS.md, 골격(package.json, wrangler.toml, schema.sql, 조립기, 공통 조각, site.json, common.js), 설계안 docs/design.md |

| 2026-11-17 | 2 | Codex: validate.js + 테스트 64개(2A), inquiry API·D1 저장·빈도 제한 + 테스트 33개(2B). 팀장: 검수·커밋, 로컬 서버(8791) 통합 테스트 7종 통과(저장·400·폼·405·honeypot·429·해시 저장) |
| 2026-11-17 | 3 | Codex: 페이지 초안 8개·404·문의 폼 JS·sitemap·robots (db13c6f). 팀장: 검수(금지 표현 0, 링크·폼 요소 확인) 후 디자인 개편 — 토큰·컴포넌트·공통 조각·페이지 9개 재구성 (1f9feb5) |
| 2026-11-17 | 4 | docs/image-prompts.md (8장), docs/copy.md (문구·금지 표현 점검) |
| 2026-11-17 | 5 | 팀장 직접 확인 8개 기준(비밀값·URL 15개·CTA 10개·금지 표현·타 브랜드·테스트·375px 9페이지·하단 바·폼 e2e→D1). 검수자 5명 독립 검수 → 차단 4건·권장 20여 건 반영(커밋 참조). 남은 경고 10건은 og:image(이미지 전) 와 404 canonical(의도) |
| 2026-11-17 | 디자인 2차 | 자사 이미지 에셋 반영(히어로 카드, 상품권 종류 타일 2종, 구입 안내 카드 이미지 3종, og-image 1200×630 합성). 채팅 상담은 채널톡 링크로 |
| 2026-11-17 | CTA → 채널톡 | 모든 문의 CTA 를 채널톡 채팅 페이지(새 창)로. 문의 폼은 보조 경로(하단 바·퀵바·푸터) |
| 2026-11-17 | 프리뷰 배포 | https://work-new-site.moneyplan-site-2pu.pages.dev (배포 64da7cd2). 실환경 확인: 페이지·자산 200, 없는 경로 404, 보안 헤더, API 405/400/403, 정상 제출 200 → 원격 D1 id 1 저장(IP 해시). 테스트 행 1건(name 프리뷰테스트)은 운영 배포 전 삭제 예정 |
| 2026-11-17 | 운영 배포 | work/new-site → main 병합(bfb82d4)·push, `/launch` 점검(오류 0, 분석 코드 유지, 비밀정보 없음), Pages production 배포 824ce6b1 → https://moneyplan-site-2pu.pages.dev 전 페이지 200·API 405/400 확인, 원격 D1 테스트 행 삭제(0건). 도메인은 아직 Firebase |
| 2026-11-17 | **출시** | new-site → main 병합·push(d5726b5) → Pages 운영 빌드 fdb32530 → 상품권재테크.com 교체. 실도메인 검증: 페이지·빌드 산출물 200, 내부 문서·옛 이미지 404(옛 캐시에 남은 CLAUDE.md 는 보강 배포 3c2c749 의 Functions 404 로 해소), 보안 헤더, API 405/400, http→https 301. www 는 522(미연결) |

## 대기 (재욱님)
| 항목 | 어디에 쓰이나 | 현재 값 |
|---|---|---|
| 채널톡 채팅 전환 측정 | Google Ads 전환 | 링크 방식이라 채팅 시작은 측정 불가. 필요하면 머니플랜 채널의 플러그인 키로 SDK 삽입 |
| 통신판매업 신고번호 | 푸터 | 재욱님: 없음 → 행 자체를 뺌(2026-11-17). 생기면 footer.html 주석 자리에 추가 |
| 문의 알림 수신 방식 | `functions/lib/notify.js` (미작성) | 없음 |
| 로고 원본 | 헤더 | 회색 네모 자리 |
| 도메인 연결(상품권재테크.com → Pages) | 출시 | Pages 프로젝트에 커스텀 도메인 추가 후 DNS 전환. Firebase 비활성은 그 직후 |
| og-image.png | 공유 미리보기 | 자사 카드 일러스트로 합성해 넣음. 사진형으로 바꾸려면 docs/image-prompts.md |
| 환불 규정, 보유 기간 확정 | mobile-payment·faq·contact 주석 자리, privacy | 플레이스홀더 |
| 대표 이메일 확인 | 푸터 | www@koreagiftcard.co.kr (협회 사이트 FAQ 기재값) — 머니플랜 수신함으로 맞는지 확인 |

## 다음 순서
1. 네이버 서치어드바이저 수집 요청(재욱님), GTM 미리보기로 cta_click·inquiry_submit·channeltalk_open 발동 확인, Site Desk 다음 수집본(매일 자동)에서 GA4·GSC 정상 확인. 끝난 것: Search Console sitemap 재제출, www 커스텀 도메인 추가(200), GTM 버전 4 게시로 GA4 수신 시작(2026-11-17)
3. 운영 D1 문의 확인 방법: `npx wrangler d1 execute DB --remote --command "SELECT * FROM inquiries ORDER BY id DESC LIMIT 20"` (알림 미구현). 월 1회 보유 기간 지난 행 정리
4. 이후 변경은 새 작업 브랜치 → main 병합 → 자동 배포. main push = 실배포이므로 항상 재욱님 확인 후
5. moneyplan-site 저장소·Pages 프로젝트(스테이징)는 필요 없으면 삭제

## 2026-11-17 밤 — 출시 후 등록 점검
- Site Desk(26.10.19 GA4) 읽기 전용 확인: origin/main a93c5ab, 마지막 collect 실행(2026-11-16) 성공(수집·보호 Pages 배포 단계 모두 success). config/sites.json 에 머니플랜이 이미 등록(id xn--zf0b677a35e9vj85a47j-com, GA4 속성 533182408 / G-3H052F1CDF, GSC https://xn--zf0b677a35e9vj85a47j.com/). 상위 폴더 site-desk 시범본은 건드리지 않음.
- Cloudflare Pages gift260415-1 에 www.xn--zf0b677a35e9vj85a47j.com 커스텀 도메인 추가(기존 A 레코드 220.90.209.174 → CNAME). https://www.xn--zf0b677a35e9vj85a47j.com/ 200 확인.
- Search Console: 속성 존재, sitemap.xml 재제출(제출일 2026-11-17 표시).
- GA4: 속성 533182408 웹 스트림 14378159633 의 측정 ID 는 G-3H052F1CDF. 실사이트는 GTM 을 통해 G-34052F1CDF 로 수집 요청을 보내고 있었고, 이 ID 는 계정 내 어느 속성에도 없음(검색 0건) → 4월 GTM 설정의 오타로 판단. 속성은 '아직 데이터 없음' 상태.
- GTM-K52V6QRJ 작업공간에서 GA4 - Configuration(Google 태그)·GA4 - qualify_lead·GA4 - close_convert_lead 의 ID 를 G-3H052F1CDF 로 수정·저장. 저장 중 GTM 이 자동 추가한 Google Analytics 태그 1개와 설정 2개는 범위 밖이라 취소해 대기 변경은 태그 3개 수정만 남김. 게시는 재욱님 확인 대기.
- 재욱님 승인 후 GTM 버전 4 "GA4 측정 ID 수정 (G-34052F1CDF → G-3H052F1CDF)" 게시(2026-11-17 19:29). 실사이트 접속 시 collect 요청의 tid 가 G-3H052F1CDF 로 바뀐 것과 GA4 실시간 '지난 30분 활성 사용자 1(South Korea)' 확인. 홈의 '아직 데이터 없음' 배너는 처리 지연으로 잠시 남음.
