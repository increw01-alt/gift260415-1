# 세션 상태 — 머니플랜

<!--
  이 파일은 두 구역으로 나뉜다.
  1) CHECKPOINT 구역: 세션 시작 훅이 그대로 읽어 보여 준다. 덧붙이지 말고 덮어쓴다. 25줄 이내.
  2) 그 아래 "기록": 자유 형식. 훅은 읽지 않는다.
  처음 보는 사람이 이 구역만 읽고 바로 이어서 일할 수 있게 쓴다.
-->

<!-- CHECKPOINT -->
**갱신:** 2026-11-17 20:10
**브랜치:** `new-site` (origin gift260415-1. main = 기존 랜딩 + 키트, 실사이트 배포 중)
**지금 하는 일:** 신규 사이트를 이 저장소로 옮겨 Pages 프로젝트 gift260415-1(Git 연동, main push = 배포)로 교체하는 중. 빌드 설정(npm run build / public) 변경 완료, secret 등록 완료, new-site push → 프리뷰 빌드 대기
**다음 한 걸음:** 프리뷰(new-site.gift260415-1.pages.dev) 검증 → 재욱님 확인 후 main 병합·push(=실사이트 교체) → 실도메인 확인, 기존 루트 파일 노출 해소 확인, Search Console sitemap 재제출
**막힌 것:** 없음
**작업 중 파일:** 없음
**확인 대기(재욱님):** main 병합 시점
<!-- /CHECKPOINT -->

## 기록

- 2026-11-17: 웹 스튜디오 키트 설치 후 `/start 머니플랜` 실행. brands.tsv 와 4월 소스(index.html)에서 브랜드명·도메인·대표번호·GTM ID 확인해 기록. 나머지는 확인 대기.
- 2026-11-17: 4월 소스 `머니플랜260415/gift260415-1-main` 을 .git 포함해 복사. .gitignore 병합(.claude/ 추적 전환, _보관/ 제외), firebase.json 배포 제외 목록에 키트 파일 추가, 키트 설치본은 `_보관/` 으로 이동. 작업 브랜치 work/web-studio-kit 생성. site-check: 오류 0 · 경고 1(헤딩 건너뜀) · 참고 4.
- 2026-11-17: site-check.py 에 stdin/stdout/stderr UTF-8 reconfigure 추가 (윈도우 cp949 콘솔에서 멈추던 문제). 일반·--json·훅 호출 2종 모두 PYTHONUTF8 없이 동작 확인.
- 2026-11-17: project.yaml analytics 에 GA4 G-34052F1CDF, Ads AW-17762127179, Pixel 1683722935954617 등록(4월 GTM 메모 기준, HTML 에는 GTM 만 있음). index.html 강점 카드 4개 h4→h3, CSS 선택자 동일 변경. site-check 오류 0 · 경고 0 · 참고 4(이미지 크기 미지정 7, 404.html 없음, 사업자 정보 문구 없음, 본문 글자 수).
- 2026-11-17 저녁: 상품권재테크.com 이 Cloudflare Pages gift260415-1(Git 연동)에서 서빙 중임을 확인(Firebase 아님). 오늘 오후 main push 가 실배포됐고 키트 문서가 루트에 노출됨 → 신규 사이트(26.11.17 머니플랜 신규사이트)를 new-site 브랜치로 옮겨 교체 준비. 방침·약관 확정. Pages 빌드 설정 변경, IP_HASH_SALT 등록.
