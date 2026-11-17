# 세션 상태 — 머니플랜

<!--
  이 파일은 두 구역으로 나뉜다.
  1) CHECKPOINT 구역: 세션 시작 훅이 그대로 읽어 보여 준다. 덧붙이지 말고 덮어쓴다. 25줄 이내.
  2) 그 아래 "기록": 자유 형식. 훅은 읽지 않는다.
  처음 보는 사람이 이 구역만 읽고 바로 이어서 일할 수 있게 쓴다.
-->

<!-- CHECKPOINT -->
**갱신:** 2026-11-17 15:35
**브랜치:** `work/web-studio-kit` (배포 브랜치 main, 원격 github.com/increw01-alt/gift260415-1)
**지금 하는 일:** /start 온보딩 마무리 — site-check.py UTF-8 입출력 수정 커밋
**다음 한 걸음:** GA4·Ads·Pixel ID 를 project.yaml analytics 에 등록할지 재욱님 답 받기. 그 뒤 index.html 1123행 h2→h4 헤딩 건너뜀 처리 여부 결정
**막힌 것:** 없음
**작업 중 파일:** 없음
**확인 대기(재욱님):** GA4/Ads/Pixel ID 등록 여부, 헤딩 건너뜀 수정 여부, 배포가 여전히 Firebase Hosting 인지, work/web-studio-kit 를 main 에 합칠 시점
<!-- /CHECKPOINT -->

## 기록

- 2026-11-17: 웹 스튜디오 키트 설치 후 `/start 머니플랜` 실행. brands.tsv 와 4월 소스(index.html)에서 브랜드명·도메인·대표번호·GTM ID 확인해 기록. 나머지는 확인 대기.
- 2026-11-17: 4월 소스 `머니플랜260415/gift260415-1-main` 을 .git 포함해 복사. .gitignore 병합(.claude/ 추적 전환, _보관/ 제외), firebase.json 배포 제외 목록에 키트 파일 추가, 키트 설치본은 `_보관/` 으로 이동. 작업 브랜치 work/web-studio-kit 생성. site-check: 오류 0 · 경고 1(헤딩 건너뜀) · 참고 4.
- 2026-11-17: site-check.py 에 stdin/stdout/stderr UTF-8 reconfigure 추가 (윈도우 cp949 콘솔에서 멈추던 문제). 일반·--json·훅 호출 2종 모두 PYTHONUTF8 없이 동작 확인.
