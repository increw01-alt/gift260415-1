# 세션 상태 — 머니플랜

<!--
  이 파일은 두 구역으로 나뉜다.
  1) CHECKPOINT 구역: 세션 시작 훅이 그대로 읽어 보여 준다. 덧붙이지 말고 덮어쓴다. 25줄 이내.
  2) 그 아래 "기록": 자유 형식. 훅은 읽지 않는다.
  처음 보는 사람이 이 구역만 읽고 바로 이어서 일할 수 있게 쓴다.
-->

<!-- CHECKPOINT -->
**갱신:** 2026-11-17 밤
**브랜치:** `new-site` (main 3c2c749 = 실사이트 배포본 + 문서 커밋)
**지금 하는 일:** 출시 후 등록 점검 완료. www 커스텀 도메인(200), Search Console sitemap 재제출, Site Desk 등록 확인, GTM 버전 4 게시로 GA4(G-3H052F1CDF) 수신 시작 확인
**다음 한 걸음:** Site Desk 다음 자동 수집본에서 머니플랜 GA4·GSC 값이 들어오는지 확인. GTM 미리보기로 cta_click·inquiry_submit·channeltalk_open 발동 확인
**막힌 것:** 없음
**작업 중 파일:** 없음
**확인 대기(재욱님):** 네이버 서치어드바이저 수집 요청, 스테이징(moneyplan-site) 삭제 여부
<!-- /CHECKPOINT -->

## 기록

- 2026-11-17: 웹 스튜디오 키트 설치 후 `/start 머니플랜` 실행. brands.tsv 와 4월 소스(index.html)에서 브랜드명·도메인·대표번호·GTM ID 확인해 기록. 나머지는 확인 대기.
- 2026-11-17: 4월 소스 `머니플랜260415/gift260415-1-main` 을 .git 포함해 복사. .gitignore 병합(.claude/ 추적 전환, _보관/ 제외), firebase.json 배포 제외 목록에 키트 파일 추가, 키트 설치본은 `_보관/` 으로 이동. 작업 브랜치 work/web-studio-kit 생성. site-check: 오류 0 · 경고 1(헤딩 건너뜀) · 참고 4.
- 2026-11-17: site-check.py 에 stdin/stdout/stderr UTF-8 reconfigure 추가 (윈도우 cp949 콘솔에서 멈추던 문제). 일반·--json·훅 호출 2종 모두 PYTHONUTF8 없이 동작 확인.
- 2026-11-17: project.yaml analytics 에 GA4 G-34052F1CDF, Ads AW-17762127179, Pixel 1683722935954617 등록(4월 GTM 메모 기준, HTML 에는 GTM 만 있음). index.html 강점 카드 4개 h4→h3, CSS 선택자 동일 변경. site-check 오류 0 · 경고 0 · 참고 4(이미지 크기 미지정 7, 404.html 없음, 사업자 정보 문구 없음, 본문 글자 수).
- 2026-11-17 저녁: 상품권재테크.com 이 Cloudflare Pages gift260415-1(Git 연동)에서 서빙 중임을 확인(Firebase 아님). 오늘 오후 main push 가 실배포됐고 키트 문서가 루트에 노출됨 → 신규 사이트(26.11.17 머니플랜 신규사이트)를 new-site 브랜치로 옮겨 교체 준비. 방침·약관 확정. Pages 빌드 설정 변경, IP_HASH_SALT 등록.
- 2026-11-17 20:40: 출시. main d5726b5 → Pages 운영 빌드 → 실도메인 교체 확인. 엣지 캐시에 남은 옛 CLAUDE.md 는 캐시 제거로 정리.
- 2026-11-17 21:00: 내부 문서 경로 Functions 404 보강 배포(3c2c749). 실도메인 최종 점검: 페이지 200, 내부 경로 전부 404, API 405, 운영 D1 0건.
- 2026-11-17 밤: Site Desk 읽기 전용 확인(main a93c5ab, 수집 성공, 머니플랜 등록됨). Pages 에 www 추가, GSC sitemap 재제출. GA4 속성 533182408 은 데이터 0 — GTM 이 오타 ID G-34052F1CDF 로 보내고 있어 작업공간에서 태그 3개를 G-3H052F1CDF 로 수정·저장(미게시).
- 2026-11-17 밤: 재욱님 승인으로 GTM 버전 4 게시. 실사이트 collect tid=G-3H052F1CDF, GA4 실시간 활성 사용자 1 확인. 문서 커밋은 new-site 브랜치.
