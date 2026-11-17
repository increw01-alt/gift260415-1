// 내부 문서 경로는 빌드 출력(public)에 없지만, 예전 배포의 캐시나 설정 실수로 노출되지 않도록 항상 404 를 돌려준다.
export function onRequest() {
  return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
}
