---
paths:
  - "**/*.html"
---

# HTML 작업 규칙

- 브랜드명·도메인·대표번호·상담 링크는 `project.yaml` 값만 쓴다. 다른 브랜드 것을 복사하지 않는다
- 페이지마다 H1 은 하나. H2·H3 는 단계를 건너뛰지 않는다
- title, meta description, viewport, canonical, Open Graph 를 기본으로 넣는다
- CTA 는 상담 신청으로 이어진다. 링크는 `brand.consult_url`, 전화는 `brand.phone`
- 상담·문의 폼에는 개인정보 수집·이용 동의 체크박스와 개인정보처리방침 링크를 둔다
- 서버 전송이 없는 폼은 작동하는 척하지 않는다. `TODO` 주석으로 표시한다
- 기존 GTM, GA4, Google Ads, Meta Pixel, Naver Analytics 코드는 요청 없이 지우거나 바꾸지 않는다
- 분석 ID 가 없으면 `GTM-XXXXXXX`, `G-XXXXXXXXXX` 같은 플레이스홀더를 둔다
- 이미지는 `alt`, `width`, `height` 를 지정하고 첫 화면 밖은 `loading="lazy"`
- 아이콘은 이모지 대신 Lucide·Heroicons
- 로고는 제공된 원본만 쓴다. 다시 그리거나 색·비율·글자를 바꾸지 않는다
- JSON-LD 는 화면에 실제로 보이는 내용과 일치할 때만 넣는다
- 거래 건수·이용자 수·만족도·수상·인증·후기는 확인된 것만 쓴다. 없으면 교체하기 쉬운 플레이스홀더
- 수정한 뒤 `python3 .claude/scripts/site-check.py --files <파일>` 로 확인한다
