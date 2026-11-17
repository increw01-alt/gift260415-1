import { json, readBody } from "../lib/http.js";
import { hashIp } from "../lib/hash.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { isHoneypotTripped, validateInquiry } from "../lib/validate.js";

const MAX_BODY_BYTES = 16 * 1024;

function safeHost(origin) {
  try { return new URL(origin).host; } catch { return null; }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    // 같은 사이트에서 보낸 요청만 받는다 (다른 사이트의 폼이 방문자 브라우저로 접수를 만드는 것을 막는다)
    const fetchSite = request.headers.get("Sec-Fetch-Site");
    const origin = request.headers.get("Origin");
    const sameHost = !origin || safeHost(origin) === new URL(request.url).host;
    if (fetchSite === "cross-site" || !sameHost) {
      return json({ ok: false, errors: { _: "허용되지 않는 요청입니다" } }, 403);
    }
    // 본문 크기 상한 (문의 내용 1000자 + 여유)
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BODY_BYTES) {
      return json({ ok: false, errors: { _: "요청이 너무 큽니다" } }, 413);
    }
    // IP 해시 소금이 없으면 원문 복원이 가능한 약한 해시가 되므로 저장하지 않는다
    if (!env.IP_HASH_SALT) {
      console.error("IP_HASH_SALT 가 설정되지 않았습니다. wrangler pages secret put IP_HASH_SALT 로 넣어 주세요.");
      return json({ ok: false, errors: { _: "서버 설정 오류입니다. 전화나 채팅 상담으로 문의해 주세요" } }, 500);
    }
    const body = await readBody(request);
    if (body === null) {
      return json({ ok: false, errors: { _: "지원하지 않는 형식입니다" } }, 415);
    }
    if (body === undefined) {
      return json({ ok: false, errors: { _: "요청 내용을 읽을 수 없습니다" } }, 400);
    }
    if (isHoneypotTripped(body)) return json({ ok: true });
    const validation = validateInquiry(body);
    if (!validation.ok) return json({ ok: false, errors: validation.errors }, 400);

    const ip = request.headers.get("CF-Connecting-IP")?.trim()
      || request.headers.get("X-Forwarded-For")?.split(",", 1)[0].trim()
      || null;
    const ipHash = await hashIp(ip, env.IP_HASH_SALT);
    const limit = await checkRateLimit(env.DB, `inquiry:${ipHash}`, {
      windowSec: Number(env.RATE_LIMIT_WINDOW_SEC) || 600,
      max: Number(env.RATE_LIMIT_MAX) || 5,
    });
    if (!limit.allowed) {
      return json({ ok: false, errors: { _: "잠시 후 다시 시도해 주세요" } }, 429, {
        "Retry-After": String(limit.retryAfterSec),
      });
    }

    const { type, name, contact, message } = validation.data;
    const page = body.page == null ? null : String(body.page).slice(0, 200);
    const userAgent = request.headers.get("User-Agent")?.slice(0, 300) ?? null;
    const saved = await env.DB.prepare(`
      INSERT INTO inquiries (type, name, contact, message, consent, page, ip_hash, user_agent)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      RETURNING id
    `).bind(type, name, contact, message, page, ipHash, userAgent).first();
    if (saved?.id == null) throw new Error("문의 저장 결과에 식별자가 없습니다");

    // TODO(확인 필요): 알림 발송
    return json({ ok: true, id: saved.id });
  } catch (error) {
    console.error("문의 접수 처리 실패", error);
    return json({ ok: false, errors: { _: "문의 저장에 실패했습니다. 전화나 채팅 상담으로 문의해 주세요" } }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, errors: { _: "허용되지 않는 방법입니다" } }, 405, { Allow: "POST" });
}
