import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../functions/lib/ratelimit.js";
import { FakeD1 } from "./helpers/fake-d1.mjs";

const key = "inquiry:test-hash";
const start = new Date("2026-11-17T00:00:00.000Z");
const options = { windowSec: 600, max: 5, now: start };

test("처음 요청은 횟수 1로 저장하며 쿼리를 두 번만 실행한다", async () => {
  const db = new FakeD1();
  assert.deepEqual(await checkRateLimit(db, key, options), { allowed: true, count: 1, retryAfterSec: 0 });
  assert.deepEqual(db.rows.rate_limits, [{ key, count: 1, window_start: start.toISOString() }]);
  assert.equal(db.calls.length, 2);
});

test("창 시작 시각을 유지하며 최대 횟수까지 허용하고 초과 요청은 저장하지 않는다", async () => {
  const db = new FakeD1();
  for (let count = 1; count <= 5; count += 1) {
    const before = db.calls.length;
    const now = new Date(start.getTime() + (count - 1) * 1000);
    assert.deepEqual(await checkRateLimit(db, key, { ...options, now }), { allowed: true, count, retryAfterSec: 0 });
    assert.equal(db.calls.length - before, 2);
  }
  const rows = structuredClone(db.rows);
  const before = db.calls.length;
  assert.deepEqual(await checkRateLimit(db, key, { ...options, now: new Date(start.getTime() + 10_000) }), {
    allowed: false, count: 5, retryAfterSec: 590,
  });
  assert.equal(db.calls.length - before, 1);
  assert.deepEqual(db.rows, rows);
  assert.equal(db.rows.rate_limits[0].window_start, start.toISOString());
});

for (const elapsed of [600_000, 600_001, 1_200_000]) {
  test(`창 종료 후 ${elapsed}ms 시점에서 횟수를 1로 초기화한다`, async () => {
    const db = new FakeD1();
    db.rows.rate_limits.push({ key, count: 5, window_start: start.toISOString() });
    const now = new Date(start.getTime() + elapsed);
    assert.deepEqual(await checkRateLimit(db, key, { ...options, now }), { allowed: true, count: 1, retryAfterSec: 0 });
    assert.equal(db.rows.rate_limits[0].window_start, now.toISOString());
  });
}

test("남은 시간이 1초 미만이어도 Retry-After는 1초를 반환한다", async () => {
  const db = new FakeD1();
  db.rows.rate_limits.push({ key, count: 5, window_start: start.toISOString() });
  assert.deepEqual(await checkRateLimit(db, key, { ...options, now: new Date(start.getTime() + 599_999) }), {
    allowed: false, count: 5, retryAfterSec: 1,
  });
});

test("서로 다른 발신자의 제한 횟수를 분리한다", async () => {
  const db = new FakeD1();
  db.rows.rate_limits.push({ key, count: 5, window_start: start.toISOString() });
  assert.equal((await checkRateLimit(db, "inquiry:another-hash", options)).allowed, true);
  assert.equal((await checkRateLimit(db, key, options)).allowed, false);
  assert.equal(db.rows.rate_limits.length, 2);
});

for (const existing of [false, true]) {
  test(`동시 요청도 최대 다섯 건만 허용한다 (기존 창: ${existing})`, async () => {
    const db = new FakeD1();
    if (existing) db.rows.rate_limits.push({ key, count: 0, window_start: start.toISOString() });
    const results = await Promise.all(Array.from({ length: 12 }, () => checkRateLimit(db, key, options)));
    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.deepEqual(results.filter((result) => result.allowed).map((result) => result.count), [1, 2, 3, 4, 5]);
    assert.ok(results.filter((result) => !result.allowed).every((result) => result.count === 5 && result.retryAfterSec > 0));
    assert.equal(db.rows.rate_limits.length, 1);
    assert.equal(db.rows.rate_limits[0].count, 5);
    assert.equal(db.calls.length, 24);
  });
}

test("DB 오류는 호출자가 처리하도록 전파한다", async () => {
  const failure = new Error("테스트 DB 오류");
  await assert.rejects(checkRateLimit({ prepare() { throw failure; } }, key, options), failure);
});
