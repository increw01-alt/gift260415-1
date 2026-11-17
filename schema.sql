-- 머니플랜 문의 저장 스키마 (Cloudflare D1 / SQLite)
-- 적용: npm run db:local (로컬) / npm run db:remote (원격, 재욱님 확인 후)

CREATE TABLE IF NOT EXISTS inquiries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT    NOT NULL,                 -- mobile-payment | micro-payment | voucher-type | other
  name        TEXT    NOT NULL,                 -- 이름 또는 닉네임
  contact     TEXT    NOT NULL,                 -- 연락처(휴대폰 번호 또는 카카오톡 ID)
  message     TEXT    NOT NULL,                 -- 문의 내용
  consent     INTEGER NOT NULL DEFAULT 0,       -- 개인정보 수집·이용 동의 (1 = 동의)
  page        TEXT,                             -- 제출한 페이지 경로
  ip_hash     TEXT,                             -- 발신자 IP 의 해시 (원문 저장 안 함)
  user_agent  TEXT,
  status      TEXT    NOT NULL DEFAULT 'new',   -- new | contacted | closed (관리자 화면은 추후)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON inquiries (status);

-- 요청 빈도 제한 (KV 없이 D1 로 처리)
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    PRIMARY KEY,             -- 'inquiry:' + ip_hash
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TEXT    NOT NULL                 -- ISO 시각. 창이 지나면 count 를 0 으로
);
