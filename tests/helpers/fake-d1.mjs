// 이 프로젝트의 쿼리 세 종류만 처리하며 SQL 엔진을 대신하지 않는다.
export class FakeD1 {
  rows = { inquiries: [], rate_limits: [] };
  calls = [];

  prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    const statement = (args = []) => {
      const execute = (method) => {
        this.calls.push({ sql: normalized, args: [...args], method });
        let results = [];
        let changes = 0;
        let lastRowId = 0;

        if (/^SELECT count, window_start FROM rate_limits WHERE key = \?$/i.test(normalized)) {
          const row = this.rows.rate_limits.find((item) => item.key === args[0]);
          if (row) results = [{ count: row.count, window_start: row.window_start }];
        } else if (/^INSERT INTO rate_limits /i.test(normalized)
          && /ON CONFLICT\(key\) DO UPDATE/i.test(normalized)
          && /RETURNING count, window_start$/i.test(normalized)) {
          const [key, windowStart, cutoff, , , max] = args;
          let row = this.rows.rate_limits.find((item) => item.key === key);
          if (!row) {
            row = { key, count: 1, window_start: windowStart };
            this.rows.rate_limits.push(row);
            changes = 1;
          } else if (row.window_start <= cutoff) {
            row.count = 1;
            row.window_start = windowStart;
            changes = 1;
          } else if (row.count < max) {
            row.count += 1;
            changes = 1;
          }
          if (changes) results = [{ count: row.count, window_start: row.window_start }];
        } else if (/^INSERT INTO inquiries /i.test(normalized) && /RETURNING id$/i.test(normalized)) {
          const [type, name, contact, message, page, ipHash, userAgent] = args;
          lastRowId = this.rows.inquiries.length + 1;
          this.rows.inquiries.push({
            id: lastRowId, type, name, contact, message, consent: 1,
            page, ip_hash: ipHash, user_agent: userAgent, status: "new",
          });
          changes = 1;
          results = [{ id: lastRowId }];
        } else {
          throw new Error("테스트 대역이 지원하지 않는 SQL입니다");
        }
        return { success: true, results, meta: { changes, last_row_id: lastRowId } };
      };
      return {
        bind: (...values) => statement(values),
        first: async () => execute("first").results[0] ?? null,
        run: async () => execute("run"),
        all: async () => execute("all"),
      };
    };
    return statement();
  }
}
