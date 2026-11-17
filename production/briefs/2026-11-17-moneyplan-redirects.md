# 기존 URL 목록과 리다이렉트 표 — 머니플랜 (강도 full)

기준: 현재 sitemap.xml 과 index.html (2026-11-17). 기존 사이트는 1페이지이며 앵커로만 이동한다.

| 기존 URL | 유형 | 새 URL | 처리 |
|---|---|---|---|
| `/` | 페이지 | `/` | 유지 (내용 교체) |
| `/#consult-form` | 앵커 | `/contact/` | 메인 하단에 문의 배너를 두고 `/contact/` 로 링크. 앵커 자체는 서버 리다이렉트 불가 |
| `/sitemap.xml` | 파일 | `/sitemap.xml` | 새 8페이지로 재작성 |
| `/robots.txt` | 파일 | `/robots.txt` | 유지, Sitemap 줄 유지 |
| `/favicon.svg` | 파일 | `/favicon.svg` | 유지 |
| `/images/*` | 이미지 | 해당 없음 | 새 사이트에서 쓰지 않음. 검색 이미지 색인 유실은 감수 |

외부 링크 유입: 광고(Google Ads 전환 `qualify_lead`, `close_convert_lead`)는 채널톡 SDK 이벤트에 묶여 있었음.
새 사이트는 채널톡 대신 전화·카카오톡·폼이므로 GTM 트리거를 새 CTA 클릭·폼 제출 이벤트로 바꿔야 함 → 출시 전 확인 항목.

출시 후 할 일: Search Console 에 sitemap 재제출, 네이버 서치어드바이저 재수집 요청, Firebase 프로젝트 비활성 시점 결정.
