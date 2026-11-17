// src/pages/**/*.html 의 <!-- include:이름 --> 자리에 src/partials/이름.html 을 끼워 public/ 에 쓴다.
// 프레임워크가 아니라 공통 조각(머리말·헤더·푸터·플로팅 버튼·하단 바)을 한 곳에서 관리하기 위한 30줄짜리 조립기다.
// 페이지별 값은 파일 맨 위 <!-- meta key: value --> 주석으로 적고, 조각 안의 {{key}} 가 그 값으로 바뀐다.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const SRC = "src/pages", PARTIALS = "src/partials", OUT = "public";
// 브랜드 값은 src/site.json 한 곳에만 둔다. 페이지 meta 주석이 같은 이름을 쓰면 페이지 값이 이긴다.
const site = JSON.parse(readFileSync("src/site.json", "utf8"));
const partials = Object.fromEntries(
  readdirSync(PARTIALS).filter(f => f.endsWith(".html"))
    .map(f => [f.replace(/\.html$/, ""), readFileSync(join(PARTIALS, f), "utf8")])
);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });
}

let count = 0;
for (const file of walk(SRC)) {
  let html = readFileSync(file, "utf8");
  const meta = { ...site };
  for (const m of html.matchAll(/<!--\s*meta\s+([\w-]+):\s*(.*?)\s*-->/g)) meta[m[1]] = m[2];
  // meta 값 안의 {{site_name}} 같은 사이트 치환자도 먼저 바꾼다.
  for (const k of Object.keys(meta)) meta[k] = String(meta[k]).replace(/\{\{(\w+)\}\}/g, (_, j) => (j in site ? site[j] : ""));
  html = html.replace(/<!--\s*include:([\w-]+)\s*-->/g, (_, name) => {
    if (!partials[name]) throw new Error(`${file}: 조각 없음 — ${name}`);
    return partials[name];
  });
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in meta)) throw new Error(`${file}: 정의되지 않은 치환자 {{${k}}}`);
    return meta[k];
  });
  // path 가 비어 있는 페이지(404 등)는 canonical·og:url 을 내지 않는다
  if (!meta.path) html = html.replace(/^\s*<(link rel="canonical"|meta property="og:url")[^\n]*\n/gm, "");
  const out = join(OUT, relative(SRC, file));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  count++;
}
console.log(`페이지 조립: ${count}개 → ${OUT}/`);
if (!site.channel_url) console.warn("[경고] src/site.json channel_url 이 비어 있습니다. 채팅 상담 버튼이 갈 곳이 없습니다.");

// 브라우저와 서버가 같은 문의 검증 모듈을 사용한다.
const validateOut = join(OUT, "js/validate.js");
mkdirSync(dirname(validateOut), { recursive: true });
writeFileSync(validateOut, readFileSync("functions/lib/validate.js"));
