# 기존 URL 목록과 리다이렉트 표 — 머니플랜 (강도 full)

기준: 현재 sitemap.xml 과 index.html (2026-11-17). 기존 사이트는 1페이지이며 앵커로만 이동한다.

| 기존 URL | 유형 | 새 URL | 처리 |
|---|---|---|---|
| `/` | 페이지 | `/` | 유지 (내용 교체) |
| `/#consult-form` | 앵커 | `/#consult-form` | 새 메인의 하단 문의 밴드에 `id="consult-form"` 을 두어 기존 링크가 그대로 도착 |
| `/sitemap.xml` | 파일 | `/sitemap.xml` | 새 8페이지로 재작성 |
| `/robots.txt` | 파일 | `/robots.txt` | 유지, Sitemap 줄 유지 |
| `/favicon.svg` | 파일 | `/favicon.svg` | 유지 |
| `/images/*` | 이미지 | 해당 없음(404) | 캡션에 금지 표현이 있어 제거가 맞음. 출시 후 Search Console 에서 이미지 색인 제거 확인 |
| (head) `google-site-verification` | 메타 | 유지 | 같은 도메인이라 승계. `src/site.json` 의 `google_site_verification` → head.html |
| `http://`, `www.` | 프로토콜·호스트 | `https://` apex | Cloudflare 존 설정(Always Use HTTPS, www 레코드·리다이렉트)으로 처리. 배포 전 확인 |
| `/index.html` | 파일 | `/` | Cloudflare Pages 가 자동 308 하는지 배포 후 curl 로 확인 |
| `*.web.app`, `*.firebaseapp.com` | Firebase 기본 도메인 | 해당 없음 | 기존 현금화 콘텐츠가 남지 않도록 DNS 전환 직후 Firebase 호스팅 비활성 |

외부 링크 유입: 광고(Google Ads 전환 `qualify_lead`, `close_convert_lead`)는 채널톡 SDK 이벤트에 묶여 있었음.
새 사이트는 채널톡 대신 전화·카카오톡·폼이므로 GTM 트리거를 새 CTA 클릭·폼 제출 이벤트로 바꿔야 함 → 출시 전 확인 항목.

출시 후 할 일: Search Console 에 sitemap 재제출, 네이버 서치어드바이저 재수집 요청, Firebase 프로젝트 비활성 시점 결정.
