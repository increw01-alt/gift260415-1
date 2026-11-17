export function json(body, status = 200, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export async function readBody(request) {
  const contentType = (request.headers.get("Content-Type") || "")
    .split(";", 1)[0].trim().toLowerCase();
  if (contentType === "application/json") {
    try { return await request.json(); } catch { return undefined; } // 잘못된 JSON → 호출부가 400 처리
  }
  if (contentType === "application/x-www-form-urlencoded" || contentType === "multipart/form-data") {
    try { return Object.fromEntries(await request.formData()); } catch { return undefined; }
  }
  return null;
}
