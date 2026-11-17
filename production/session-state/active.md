# 세션 상태 — 머니플랜

<!--
  이 파일은 두 구역으로 나뉜다.
  1) CHECKPOINT 구역: 세션 시작 훅이 그대로 읽어 보여 준다. 덧붙이지 말고 덮어쓴다. 25줄 이내.
  2) 그 아래 "기록": 자유 형식. 훅은 읽지 않는다.
  처음 보는 사람이 이 구역만 읽고 바로 이어서 일할 수 있게 쓴다.
-->

<!-- CHECKPOINT -->
**갱신:** 2026-11-17 15:45
**브랜치:** `work/web-studio-kit` (배포 브랜치 main, 원격 github.com/increw01-alt/gift260415-1)
**지금 하는 일:** /start 온보딩 마무리 — analytics ID 등록, 강점 카드 헤딩 h4→h3 수정 커밋
**다음 한 걸음:** 재욱님이 main 병합·push 를 허락하면 /launch 로 최종 점검 후 진행. 아니면 work/web-studio-kit 에서 다음 작업 이어가기
**막힌 것:** 없음
**작업 중 파일:** 없음
**확인 대기(재욱님):** work/web-studio-kit → main 병합과 push 시점(=Firebase 배포 여부 확인 포함)
<!-- /CHECKPOINT -->

## 기록

- 2026-11-17: 웹 스튜디오 키트 설치 후 `/start 머니플랜` 실행. brands.tsv 와 4월 소스(index.html)에서 브랜드명·도메인·대표번호·GTM ID 확인해 기록. 나머지는 확인 대기.
- 2026-11-17: 4월 소스 `머니플랜260415/gift260415-1-main` 을 .git 포함해 복사. .gitignore 병합(.claude/ 추적 전환, _보관/ 제외), firebase.json 배포 제외 목록에 키트 파일 추가, 키트 설치본은 `_보관/` 으로 이동. 작업 브랜치 work/web-studio-kit 생성. site-check: 오류 0 · 경고 1(헤딩 건너뜀) · 참고 4.
- 2026-11-17: site-check.py 에 stdin/stdout/stderr UTF-8 reconfigure 추가 (윈도우 cp949 콘솔에서 멈추던 문제). 일반·--json·훅 호출 2종 모두 PYTHONUTF8 없이 동작 확인.
- 2026-11-17: project.yaml analytics 에 GA4 G-34052F1CDF, Ads AW-17762127179, Pixel 1683722935954617 등록(4월 GTM 메모 기준, HTML 에는 GTM 만 있음). index.html 강점 카드 4개 h4→h3, CSS 선택자 동일 변경. site-check 오류 0 · 경고 0 · 참고 4(이미지 크기 미지정 7, 404.html 없음, 사업자 정보 문구 없음, 본문 글자 수).
