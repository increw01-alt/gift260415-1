export async function checkRateLimit(db, key, { windowSec, max, now = new Date() }) {
  const nowMs = now.getTime();
  const cutoff = new Date(nowMs - windowSec * 1000).toISOString();
  const row = await db.prepare("SELECT count, window_start FROM rate_limits WHERE key = ?")
    .bind(key).first();
  const inWindow = row && Date.parse(row.window_start) + windowSec * 1000 > nowMs;
  const retryAfterSec = inWindow
    ? Math.max(1, Math.ceil((Date.parse(row.window_start) + windowSec * 1000 - nowMs) / 1000))
    : Math.ceil(windowSec);

  if (inWindow && row.count >= max) {
    return { allowed: false, count: row.count, retryAfterSec };
  }

  // 조회 뒤 다른 요청이 들어와도 SQL에서 다시 한도를 검사하고 횟수를 증가시킨다.
  const updated = await db.prepare(`
    INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= ? THEN excluded.window_start ELSE rate_limits.window_start END
    WHERE rate_limits.window_start <= ? OR rate_limits.count < ?
    RETURNING count, window_start
  `).bind(key, now.toISOString(), cutoff, cutoff, cutoff, max).first();

  if (!updated) {
    // 동시 요청이 먼저 한도를 채웠다면 쓰지 않는다. 새 창 경합에서는 한 창만큼 대기한다.
    return { allowed: false, count: max, retryAfterSec };
  }
  return { allowed: true, count: updated.count, retryAfterSec: 0 };
}
