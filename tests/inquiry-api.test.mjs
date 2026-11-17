import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { onRequest, onRequestPost } from "../functions/api/inquiry.js";
import { hashIp } from "../functions/lib/hash.js";
import { FakeD1 } from "./helpers/fake-d1.mjs";

// 실제 고객 정보가 아닌 테스트 입력과 문서용 IP만 사용한다.
const validInput = {
  type: "mobile-payment", name: "테스트", contact: "010-9876-5432",
  message: "상품권 구입 방법을 문의합니다.", consent: true, page: "/contact/",
};
const ip = "192.0.2.10";
const salt = "test-salt";
const storageError = { ok: false, errors: { _: "문의 저장에 실패했습니다. 전화나 채팅 상담으로 문의해 주세요" } };
const expectedHash = (value, hashSalt = salt) => createHash("sha256").update(`${value}|${hashSalt}`).digest("hex").slice(0, 32);

function environment(db = new FakeD1(), overrides = {}) {
  return { DB: db, IP_HASH_SALT: salt, RATE_LIMIT_WINDOW_SEC: "600", RATE_LIMIT_MAX: "5", ...overrides };
}

function request(input = validInput, headers = {}) {
  return new Request("http://localhost:8790/api/inquiry", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8", "CF-Connecting-IP": ip, ...headers },
    body: JSON.stringify(input),
  });
}

async function expectResponse(response, status, body) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const parsed = await response.json();
  if (body !== undefined) assert.deepEqual(parsed, body);
  return parsed;
}

test("정상 JSON 문의의 정규화된 값과 IP 해시만 저장한다", async () => {
  const env = environment();
  const response = await onRequestPost({ env, request: request({
    ...validInput, type: " mobile-payment ", name: " 테스트 ", contact: "010-1234-5678",
    message: ` ${validInput.message} `, consent: "on", ignored: "저장하지 않을 값",
  }, { "User-Agent": "Moneyplan-API-Test/1.0", "X-Forwarded-For": "198.51.100.20" }) });
  await expectResponse(response, 200, { ok: true, id: 1 });
  assert.deepEqual(env.DB.rows.inquiries, [{
    id: 1, type: validInput.type, name: "테스트", contact: "01012345678", message: validInput.message,
    consent: 1, page: "/contact/", ip_hash: expectedHash(ip), user_agent: "Moneyplan-API-Test/1.0", status: "new",
  }]);
  assert.match(env.DB.rows.inquiries[0].ip_hash, /^[a-f0-9]{32}$/);
  assert.equal(env.DB.rows.rate_limits[0].key, `inquiry:${expectedHash(ip)}`);
  assert.equal(JSON.stringify(env.DB.rows).includes(ip), false);
  assert.equal(JSON.stringify(env.DB.calls).includes(ip), false);
  assert.equal(JSON.stringify(env.DB.rows).includes(salt), false);
});

for (const format of ["urlencoded", "multipart"]) {
  test(`${format} 폼 요청도 저장한다`, async () => {
    const env = environment();
    const body = format === "urlencoded" ? new URLSearchParams() : new FormData();
    for (const [key, value] of Object.entries(validInput)) body.set(key, String(value));
    const response = await onRequestPost({ env, request: new Request("http://localhost:8790/api/inquiry", { method: "POST", body }) });
    await expectResponse(response, 200, { ok: true, id: 1 });
    assert.equal(env.DB.rows.inquiries[0].consent, 1);
  });
}

test("동의가 없으면 400을 반환하고 DB를 호출하지 않는다", async () => {
  const env = environment();
  const body = await expectResponse(await onRequestPost({ env, request: request({ ...validInput, consent: undefined }) }), 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors.consent, "개인정보 수집·이용에 동의해야 문의를 보낼 수 있습니다");
  assert.equal(env.DB.calls.length, 0);
});

test("honeypot은 필수값 검사보다 먼저 성공 응답을 반환하고 아무 행도 저장하지 않는다", async () => {
  const env = environment();
  await expectResponse(await onRequestPost({ env, request: request({ website: "봇 입력" }) }), 200, { ok: true });
  assert.deepEqual(env.DB.rows, { inquiries: [], rate_limits: [] });
  assert.equal(env.DB.calls.length, 0);
});

test("여섯 번째 요청은 429와 Retry-After를 반환하며 추가 저장하지 않는다", async () => {
  const env = environment();
  for (let id = 1; id <= 5; id += 1) {
    await expectResponse(await onRequestPost({ env, request: request() }), 200, { ok: true, id });
  }
  const rows = structuredClone(env.DB.rows);
  const response = await onRequestPost({ env, request: request() });
  assert.match(response.headers.get("Retry-After"), /^\d+$/);
  assert.ok(Number(response.headers.get("Retry-After")) > 0);
  assert.ok(Number(response.headers.get("Retry-After")) <= 600);
  await expectResponse(response, 429, { ok: false, errors: { _: "잠시 후 다시 시도해 주세요" } });
  assert.deepEqual(env.DB.rows, rows);
});

test("환경변수의 제한 횟수와 창 크기를 사용한다", async () => {
  const env = environment(new FakeD1(), { RATE_LIMIT_WINDOW_SEC: "30", RATE_LIMIT_MAX: "1" });
  await expectResponse(await onRequestPost({ env, request: request() }), 200, { ok: true, id: 1 });
  const response = await onRequestPost({ env, request: request() });
  assert.ok(Number(response.headers.get("Retry-After")) <= 30);
  await expectResponse(response, 429);
});

test("빈도 제한 설정값이 없으면 기본값(600초·5건)으로 동작한다", async () => {
  const env = { DB: new FakeD1(), IP_HASH_SALT: salt };
  for (let id = 1; id <= 5; id += 1) {
    await expectResponse(await onRequestPost({ env, request: request() }), 200, { ok: true, id });
  }
  const response = await onRequestPost({ env, request: request() });
  assert.ok(Number(response.headers.get("Retry-After")) <= 600);
  await expectResponse(response, 429);
  assert.equal(env.DB.rows.inquiries[0].ip_hash, expectedHash(ip, salt));
});

test("IP_HASH_SALT 가 없으면 저장하지 않고 500을 반환한다", async (t) => {
  t.mock.method(console, "error", () => {});
  const env = { DB: new FakeD1() };
  await expectResponse(await onRequestPost({ env, request: request() }), 500,
    { ok: false, errors: { _: "서버 설정 오류입니다. 전화나 채팅 상담으로 문의해 주세요" } });
  assert.equal(env.DB.calls.length, 0);
});

test("다른 사이트에서 온 요청은 403으로 거부한다", async () => {
  const env = environment();
  const byHeader = await onRequestPost({ env, request: request(validInput, { "Sec-Fetch-Site": "cross-site" }) });
  await expectResponse(byHeader, 403, { ok: false, errors: { _: "허용되지 않는 요청입니다" } });
  const byOrigin = await onRequestPost({ env, request: request(validInput, { Origin: "https://evil.example" }) });
  await expectResponse(byOrigin, 403);
  const sameOrigin = await onRequestPost({ env, request: request(validInput, { Origin: "http://localhost:8790" }) });
  await expectResponse(sameOrigin, 200);
  assert.equal(env.DB.rows.inquiries.length, 1);
});

test("본문이 너무 크면 413을 반환한다", async () => {
  const env = environment();
  const big = await onRequestPost({ env, request: request(validInput, { "Content-Length": String(20 * 1024) }) });
  await expectResponse(big, 413, { ok: false, errors: { _: "요청이 너무 큽니다" } });
  assert.equal(env.DB.calls.length, 0);
});

for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
  test(`${method}는 405와 Allow: POST를 반환한다`, async () => {
    const env = environment();
    const response = await onRequest({ env, request: new Request("http://localhost:8790/api/inquiry", { method }) });
    assert.equal(response.headers.get("Allow"), "POST");
    await expectResponse(response, 405, { ok: false, errors: { _: "허용되지 않는 방법입니다" } });
    assert.equal(env.DB.calls.length, 0);
  });
}

test("공통 핸들러에 전달된 POST를 한 번만 저장한다", async () => {
  const env = environment();
  await expectResponse(await onRequest({ env, request: request() }), 200, { ok: true, id: 1 });
  assert.equal(env.DB.rows.inquiries.length, 1);
  assert.equal(env.DB.rows.rate_limits[0].count, 1);
});

test("text/plain은 415를 반환하며 DB를 호출하지 않는다", async () => {
  const env = environment();
  await expectResponse(await onRequestPost({ env, request: request(validInput, { "Content-Type": "text/plain" }) }), 415, {
    ok: false, errors: { _: "지원하지 않는 형식입니다" },
  });
  assert.equal(env.DB.calls.length, 0);
});

for (const stage of ["빈도 조회", "빈도 저장", "문의 저장"]) {
  test(`${stage} DB 오류는 500을 반환하고 원문은 응답에서 숨긴다`, async (t) => {
    const failure = new Error("테스트 전용 내부 DB 오류 상세");
    const db = new FakeD1();
    const prepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      const matches = stage === "빈도 조회" ? /SELECT/.test(sql)
        : stage === "빈도 저장" ? /INSERT INTO rate_limits/.test(sql) : /INSERT INTO inquiries/.test(sql);
      if (matches) return { bind() { return this; }, async first() { throw failure; } };
      return prepare(sql);
    };
    const log = t.mock.method(console, "error", () => {});
    await expectResponse(await onRequestPost({ env: environment(db), request: request() }), 500, storageError);
    assert.equal(log.mock.callCount(), 1);
    assert.equal(log.mock.calls[0].arguments[1], failure);
    assert.equal(db.rows.inquiries.length, 0);
  });
}

test("잘못된 JSON은 400을 돌려주고 DB를 호출하지 않는다", async () => {
  const env = environment();
  const malformed = new Request("http://localhost:8790/api/inquiry", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  });
  await expectResponse(await onRequestPost({ env, request: malformed }), 400, { ok: false, errors: { _: "요청 내용을 읽을 수 없습니다" } });
  assert.equal(env.DB.calls.length, 0);
});

test("page와 User-Agent를 제한 길이로 자르고 누락값은 null로 저장한다", async () => {
  const env = environment();
  await expectResponse(await onRequestPost({ env, request: request({ ...validInput, page: "가".repeat(250) }, {
    "User-Agent": "a".repeat(350),
  }) }), 200);
  await expectResponse(await onRequestPost({ env, request: request({ ...validInput, page: undefined }) }), 200);
  assert.equal(env.DB.rows.inquiries[0].page, "가".repeat(200));
  assert.equal(env.DB.rows.inquiries[0].user_agent, "a".repeat(300));
  assert.equal(env.DB.rows.inquiries[1].page, null);
  assert.equal(env.DB.rows.inquiries[1].user_agent, null);
});

test("Cloudflare IP가 없으면 전달 헤더 첫 IP를, 모두 없으면 unknown을 해시한다", async () => {
  const env = environment();
  const forwarded = request(validInput, { "X-Forwarded-For": "198.51.100.20, 203.0.113.30" });
  forwarded.headers.delete("CF-Connecting-IP");
  const unknown = request();
  unknown.headers.delete("CF-Connecting-IP");
  await expectResponse(await onRequestPost({ env, request: forwarded }), 200);
  await expectResponse(await onRequestPost({ env, request: unknown }), 200);
  assert.equal(env.DB.rows.inquiries[0].ip_hash, expectedHash("198.51.100.20"));
  assert.equal(env.DB.rows.inquiries[1].ip_hash, expectedHash("unknown"));
});

test("해시는 구분자를 포함한 SHA-256 앞 32자이며 salt에 따라 달라진다", async () => {
  assert.equal(await hashIp(ip, salt), expectedHash(ip));
  assert.equal(await hashIp(ip), expectedHash(ip, ""));
  assert.equal(await hashIp(null), expectedHash("unknown", ""));
  assert.notEqual(await hashIp(ip, salt), await hashIp(ip));
});
