#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""정적 사이트 점검 스크립트 (표준 라이브러리만 사용).

원칙: 이 스크립트는 "관찰"만 한다. 고칠지 말지는 팀장(Claude Code)이 판단한다.

사용 예
  python3 .claude/scripts/site-check.py                 # 사이트 전체
  python3 .claude/scripts/site-check.py --files a.html  # 지정한 파일만
  python3 .claude/scripts/site-check.py --strict        # 오류가 있으면 종료 코드 1
  python3 .claude/scripts/site-check.py --json          # 기계가 읽는 출력

등급
  오류  반드시 고쳐야 하는 것 (깨진 경로, title 없음, H1 개수, 비밀정보 등)
  경고  확인이 필요한 것 (메타 누락, alt 누락, 동의 체크박스, 다른 브랜드 자산 등)
  참고  알아 두면 좋은 것 (플레이스홀더 잔존, 이미지 크기 미지정 등)
"""
import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

# Windows 콘솔(cp949)에서도 한글·특수문자 때문에 멈추지 않도록 입출력을 UTF-8 로 맞춘다.
# 훅이 표준 입력으로 넘기는 파일 목록(한글 경로)도 같은 이유로 UTF-8 로 읽는다.
for _stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, AttributeError):
            pass

SKIP_DIRS = {
    ".git", "node_modules", ".claude", "production", ".wrangler", ".next",
    ".astro", ".cache", "_보관", "_중복파일", "__pycache__", ".venv", "venv",
}
TEXT_EXT = {
    ".html", ".htm", ".js", ".mjs", ".ts", ".css", ".json", ".md", ".py",
    ".yml", ".yaml", ".txt", ".toml", ".xml", ".sh", ".env",
}
HEADING = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}

# 커밋되면 안 되는 비밀정보 패턴 (validate-commit.sh 와 같은 목록)
SECRET_PATTERNS = [
    ("개인 키(PRIVATE KEY)", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("AWS Access Key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub 토큰", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b")),
    ("GitHub 토큰(fine-grained)", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{22,}\b")),
    ("결제 비밀 키(sk_live/sk_test)", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    ("Slack 토큰", re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b")),
]
# sk- 로 시작하는 API 키. CSS 클래스(sk-fading-circle 등)와 구분하려고 형태를 한 번 더 본다.
SK_TOKEN = re.compile(r"(?<![A-Za-z0-9_])sk-[A-Za-z0-9_\-]{20,}")


def find_secrets(line):
    """한 줄에서 비밀정보로 보이는 값의 종류 목록을 돌려준다."""
    labels = [label for label, pattern in SECRET_PATTERNS if pattern.search(line)]
    for m in SK_TOKEN.finditer(line):
        tok = m.group(0)
        mixed = (re.search(r"\d", tok) and re.search(r"[A-Z]", tok) and re.search(r"[a-z]", tok))
        if tok.startswith(("sk-ant-", "sk-proj-")) or mixed:
            labels.append("API 키(sk-)")
            break
    return labels
PLACEHOLDER_PATTERNS = [
    ("GTM 플레이스홀더", re.compile(r"GTM-X{4,}")),
    ("GA4 플레이스홀더", re.compile(r"\bG-X{6,}\b")),
    ("TODO 주석", re.compile(r"\bTODO\b")),
    ("lorem ipsum", re.compile(r"lorem ipsum", re.I)),
]
TRACK_PATTERNS = {
    "gtm_id": re.compile(r"\bGTM-[A-Z0-9]{4,10}\b"),
    "ga4_id": re.compile(r"\bG-[A-Z0-9]{8,12}\b"),
    "ads_id": re.compile(r"\bAW-\d{8,12}\b"),
    "pixel_id": re.compile(r"fbq\(\s*['\"]init['\"]\s*,\s*['\"](\d{10,20})['\"]"),
}
TRACK_LABEL = {
    "gtm_id": "GTM", "ga4_id": "GA4", "ads_id": "Google Ads", "pixel_id": "Meta Pixel",
}


# ---------------------------------------------------------------- 설정 읽기
def load_config(path):
    """project.yaml 의 2단계(섹션.키) 값만 읽는 최소 파서."""
    cfg = {}
    if not os.path.isfile(path):
        return cfg
    section = None
    with open(path, encoding="utf-8-sig") as fh:
        for raw in fh:
            line = raw.rstrip("\r\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
            if m:
                section = m.group(1)
                rest = _clean(m.group(2))
                if rest != "":
                    cfg[section] = rest
                continue
            m = re.match(r"^\s+([A-Za-z_][\w-]*):\s*(.*)$", line)
            if m and section:
                cfg[section + "." + m.group(1)] = _clean(m.group(2))
    return cfg


def _clean(value):
    value = value.strip()
    if value[:1] in ("'", '"'):
        quote = value[0]
        end = value.find(quote, 1)
        return value[1:end] if end > 0 else value[1:]
    return re.sub(r"\s+#.*$", "", value).strip()


def load_brands(path):
    """brands.tsv -> [{key,name,domains[],phones[]}]"""
    rows = []
    if not os.path.isfile(path):
        return rows
    with open(path, encoding="utf-8-sig") as fh:
        for raw in fh:
            line = raw.rstrip("\r\n")
            if not line.strip() or line.startswith("#"):
                continue
            cols = line.split("\t")
            cols += [""] * (4 - len(cols))
            rows.append({
                "key": cols[0].strip(),
                "name": cols[1].strip(),
                "domains": [d.strip().lower() for d in cols[2].split(",") if d.strip()],
                "phones": [p.strip() for p in cols[3].split(",") if p.strip()],
            })
    return rows


def to_puny(domain):
    try:
        return domain.encode("idna").decode("ascii").lower()
    except Exception:
        return domain.lower()


# ---------------------------------------------------------------- HTML 파싱
class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None
        self.has_html = False
        self.title = None
        self._in_title = False
        self.metas = {}
        self.canonical = None
        self.headings = []        # (level, line)
        self.imgs = []            # (attrs, line)
        self.refs = []            # (url, line, kind)
        self.ids = set()
        self.jsonld = []          # (text, line)
        self._jsonld_buf = None
        self._jsonld_line = 0
        self._skip_text = 0
        self.text_len = 0
        self.forms = []           # {line, checkbox, text}
        self._form = None
        self.link_texts = []      # (href, text)
        self._a_href = None
        self._a_buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if "id" in a and a["id"]:
            self.ids.add(a["id"])
        if tag == "html":
            self.has_html = True
            self.lang = a.get("lang")
        elif tag == "title":
            self._in_title = True
            self.title = ""
        elif tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key:
                self.metas[key] = a.get("content") or ""
        elif tag == "link":
            rel = (a.get("rel") or "").lower()
            href = a.get("href")
            if "canonical" in rel:
                self.canonical = href or ""
            elif href and any(r in rel for r in ("stylesheet", "icon", "manifest", "preload")):
                self.refs.append((href, line, "link"))
        elif tag in HEADING:
            self.headings.append((HEADING[tag], line))
        elif tag == "img":
            self.imgs.append((a, line))
            if a.get("src"):
                self.refs.append((a["src"], line, "img"))
        elif tag == "a":
            href = a.get("href")
            self._a_href = href or ""
            self._a_buf = []
            if href:
                self.refs.append((href, line, "a"))
        elif tag == "script":
            if (a.get("type") or "").lower() == "application/ld+json":
                self._jsonld_buf = []
                self._jsonld_line = line
            else:
                self._skip_text += 1
            if a.get("src"):
                self.refs.append((a["src"], line, "script"))
        elif tag == "style":
            self._skip_text += 1
        elif tag in ("source", "video", "audio", "iframe"):
            if a.get("src"):
                self.refs.append((a["src"], line, tag))
        elif tag == "form":
            self._form = {"line": line, "checkbox": False, "text": []}
        elif tag == "input" and self._form is not None:
            if (a.get("type") or "").lower() == "checkbox":
                self._form["checkbox"] = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script":
            if self._jsonld_buf is not None:
                self.jsonld.append(("".join(self._jsonld_buf), self._jsonld_line))
                self._jsonld_buf = None
            elif self._skip_text:
                self._skip_text -= 1
        elif tag == "style" and self._skip_text:
            self._skip_text -= 1
        elif tag == "form" and self._form is not None:
            self._form["text"] = "".join(self._form["text"])
            self.forms.append(self._form)
            self._form = None
        elif tag == "a" and self._a_href is not None:
            self.link_texts.append((self._a_href, "".join(self._a_buf).strip()))
            self._a_href = None

    def handle_data(self, data):
        if self._jsonld_buf is not None:
            self._jsonld_buf.append(data)
            return
        if self._in_title:
            self.title += data
            return
        if self._skip_text:
            return
        self.text_len += len(data.strip())
        if self._form is not None:
            self._form["text"].append(data)
        if self._a_href is not None:
            self._a_buf.append(data)


# ---------------------------------------------------------------- 점검 본체
class Report:
    def __init__(self):
        self.items = []  # (level, file, line, message)

    def add(self, level, file, line, msg):
        self.items.append((level, file, line, msg))

    def count(self, level):
        return sum(1 for i in self.items if i[0] == level)


def find_files(root, exts):
    out = []
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".git")]
        for name in files:
            if os.path.splitext(name)[1].lower() in exts or (".env" in exts and name.startswith(".env")):
                out.append(os.path.join(base, name))
    return sorted(out)


def resolve_local(url, file_path, site_root, own_hosts, extra_roots):
    """url 이 로컬 파일을 가리키면 (True, 존재여부, 표시경로), 아니면 (False, None, host)."""
    u = url.strip()
    if not u or u.startswith("#"):
        return ("skip", None, None)
    low = u.lower()
    if low.startswith(("mailto:", "tel:", "sms:", "javascript:", "data:", "blob:", "kakaotalk:", "about:")):
        return ("skip", None, None)
    if "{{" in u or "${" in u or "<%" in u:
        return ("skip", None, None)  # 템플릿 표현식
    parsed = urlparse(u)
    path = unquote(parsed.path or "")
    if parsed.scheme in ("http", "https") or u.startswith("//"):
        host = (parsed.netloc or "").lower().split("@")[-1].split(":")[0]
        bare = host[4:] if host.startswith("www.") else host
        if bare not in own_hosts:
            return ("external", None, host)
        base_dirs = [site_root] + extra_roots
        rel = path.lstrip("/")
    elif parsed.scheme:
        return ("skip", None, None)
    elif path.startswith("/"):
        base_dirs = [site_root] + extra_roots
        rel = path.lstrip("/")
    else:
        base_dirs = [os.path.dirname(file_path)]
        rel = path
    if rel == "" and not path:
        return ("skip", None, None)  # ?query 만 있는 링크
    for base in base_dirs:
        target = os.path.normpath(os.path.join(base, rel))
        candidates = [target]
        if os.path.isdir(target) or rel.endswith("/") or rel == "":
            candidates = [os.path.join(target, "index.html")]
        elif not os.path.splitext(target)[1]:
            candidates += [target + ".html", os.path.join(target, "index.html")]
        if any(os.path.isfile(c) for c in candidates):
            return ("local", True, u)
    return ("local", False, u)


def check_html(path, rel, cfg, ctx, rep):
    try:
        with open(path, encoding="utf-8-sig", errors="replace") as fh:
            src = fh.read()
    except OSError as exc:
        rep.add("오류", rel, 0, "파일을 읽지 못함: %s" % exc)
        return
    page = Page()
    try:
        page.feed(src)
        page.close()
    except Exception as exc:  # 깨진 HTML 이어도 나머지 파일은 계속 본다
        rep.add("경고", rel, 0, "HTML 파싱 중 문제: %s" % exc)

    is_full_doc = page.has_html or "<head" in src.lower()
    if is_full_doc:
        if not page.lang:
            rep.add("경고", rel, 1, "<html lang> 없음")
        if page.title is None or not page.title.strip():
            rep.add("오류", rel, 1, "<title> 없음 또는 비어 있음")
        if not page.metas.get("description", "").strip():
            rep.add("경고", rel, 1, "meta description 없음")
        if "viewport" not in page.metas:
            rep.add("경고", rel, 1, "meta viewport 없음")
        if page.canonical is None:
            rep.add("경고", rel, 1, "canonical 없음")
        missing_og = [k for k in ("og:title", "og:description", "og:image") if not page.metas.get(k)]
        if missing_og:
            rep.add("경고", rel, 1, "Open Graph 누락: " + ", ".join(missing_og))
        h1 = [h for h in page.headings if h[0] == 1]
        if len(h1) == 0:
            rep.add("오류", rel, 1, "H1 없음")
        elif len(h1) > 1:
            rep.add("오류", rel, h1[1][1], "H1 이 %d개 (1개만 두어야 함)" % len(h1))
        prev = 0
        for level, line in page.headings:
            if prev and level > prev + 1:
                rep.add("경고", rel, line, "헤딩 단계 건너뜀: h%d 다음에 h%d" % (prev, level))
            prev = level
        if page.text_len:
            rep.add("참고", rel, 0, "본문 글자 수 약 %d자" % page.text_len)

    # 이미지
    no_alt = [line for a, line in page.imgs if "alt" not in a]
    if no_alt:
        rep.add("경고", rel, no_alt[0], "alt 없는 이미지 %d개 (첫 위치 표시)" % len(no_alt))
    no_size = [line for a, line in page.imgs if not (a.get("width") and a.get("height"))]
    if no_size:
        rep.add("참고", rel, no_size[0], "width/height 없는 이미지 %d개" % len(no_size))

    # 경로
    broken_level = "오류" if ctx["site_type"] == "static" else "경고"
    seen = set()
    for url, line, kind in page.refs:
        state, exists, shown = resolve_local(url, path, ctx["site_root"], ctx["own_hosts"], ctx["extra_roots"])
        if state == "local" and exists is False and (url, kind) not in seen:
            seen.add((url, kind))
            rep.add(broken_level, rel, line, "깨진 경로(%s): %s" % (kind, url))
        if url.startswith("#") and len(url) > 1 and url[1:] not in page.ids and ("#", url) not in seen:
            seen.add(("#", url))
            rep.add("경고", rel, line, "페이지 안에 없는 앵커: %s" % url)

    # JSON-LD
    for text, line in page.jsonld:
        try:
            json.loads(text)
        except Exception as exc:
            rep.add("오류", rel, line, "JSON-LD 문법 오류: %s" % str(exc)[:80])

    # 폼: 개인정보 동의, 처리방침 링크
    if page.forms:
        has_policy_link = any(
            ("개인정보" in text and "방침" in text) or "privacy" in (href or "").lower()
            for href, text in page.link_texts
        )
        for form in page.forms:
            if not (form["checkbox"] and "개인정보" in form["text"]):
                rep.add("경고", rel, form["line"], "폼에 개인정보 수집·이용 동의 체크박스가 보이지 않음")
        if not has_policy_link:
            rep.add("경고", rel, page.forms[0]["line"], "폼이 있는데 개인정보처리방침 링크가 보이지 않음")

    # 추적 코드
    for kind, pattern in TRACK_PATTERNS.items():
        found = set(m.group(1) if pattern.groups else m.group(0) for m in pattern.finditer(src))
        found = {f for f in found if not re.fullmatch(r"(GTM-|G-)X+", f)}
        want = cfg.get("analytics." + kind, "")
        for value in sorted(found):
            if want and value != want:
                rep.add("경고", rel, 0, "%s ID 불일치: %s (project.yaml 등록값 %s)" % (TRACK_LABEL[kind], value, want))
            elif not want:
                ctx["unregistered"].setdefault((kind, value), rel)

    # 다른 브랜드 자산
    low = src.lower()
    for brand in ctx["other_brands"]:
        for domain in brand["domains"]:
            if re.search(r"(?<![a-z0-9\-가-힣])" + re.escape(domain) + r"(?![a-z0-9\-])", low):
                rep.add("경고", rel, 0, "다른 브랜드 도메인 언급: %s (%s) — 네트워크 내부 링크면 정상" % (domain, brand["name"]))
        for phone in brand["phones"]:
            if phone in src or phone.replace("-", "") in src:
                rep.add("경고", rel, 0, "다른 브랜드 대표번호: %s (%s)" % (phone, brand["name"]))

    # 플레이스홀더
    for label, pattern in PLACEHOLDER_PATTERNS:
        n = len(pattern.findall(src))
        if n:
            rep.add("참고", rel, 0, "%s %d곳 — 배포 전 교체 여부 확인" % (label, n))


def check_secrets(files, root, rep):
    for path in files:
        rel = os.path.relpath(path, root)
        try:
            if os.path.getsize(path) > 2_000_000:
                continue
            with open(path, encoding="utf-8", errors="ignore") as fh:
                for no, line in enumerate(fh, 1):
                    for label in find_secrets(line):
                        rep.add("오류", rel, no, "비밀정보로 보이는 값: %s" % label)
        except OSError:
            continue
        name = os.path.basename(path)
        if name == ".env" or (name.startswith(".env.") and not name.endswith((".example", ".sample"))):
            rep.add("경고", rel, 0, ".env 파일이 프로젝트 안에 있음 — .gitignore 포함 여부 확인")


def main():
    ap = argparse.ArgumentParser(description="정적 사이트 점검 (관찰만 함)")
    ap.add_argument("--root", default=".", help="프로젝트 루트 (project.yaml 위치)")
    ap.add_argument("--files", nargs="*", help="이 파일들만 점검")
    ap.add_argument("--files-from", help="점검할 파일 목록(한 줄에 하나, 루트 기준 경로). - 는 표준 입력")
    ap.add_argument("--secrets-only", action="store_true", help="비밀정보 검사만 하고 발견한 줄만 출력")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--strict", action="store_true", help="오류가 있으면 종료 코드 1")
    ap.add_argument("--errors-only", action="store_true")
    ap.add_argument("--max", type=int, default=40, help="등급별 최대 표시 건수")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if args.files_from:
        src = sys.stdin if args.files_from == "-" else open(args.files_from, encoding="utf-8")
        listed = [ln.strip() for ln in src.read().splitlines() if ln.strip()]
        args.files = (args.files or []) + [os.path.join(root, f) for f in listed]
        if not args.files:
            return
    if args.secrets_only:
        rep = Report()
        targets = [os.path.abspath(f) for f in (args.files or []) if os.path.isfile(f)] \
            if args.files is not None else find_files(root, TEXT_EXT)
        check_secrets(targets, root, rep)
        for level, file, line, msg in rep.items:
            if level == "오류":
                print("  - %s:%d  %s" % (file, line, msg))
        return
    cfg = load_config(os.path.join(root, "project.yaml"))
    brands = load_brands(os.path.join(root, ".claude", "brands.tsv"))

    site_root = os.path.normpath(os.path.join(root, cfg.get("site.root", ".") or "."))
    if not os.path.isdir(site_root):
        site_root = root
    site_type = (cfg.get("site.type", "static") or "static").lower()
    extra_roots = [p for p in (os.path.join(site_root, "public"), os.path.join(root, "public")) if os.path.isdir(p)]

    own_hosts = set()
    brand_key = cfg.get("brand.key", "")
    domain = cfg.get("brand.domain", "").lower().replace("https://", "").replace("http://", "").strip("/")
    if domain:
        own_hosts.update({domain, to_puny(domain)})
    me = next((b for b in brands if b["key"] == brand_key), None) if brand_key else None
    if me:
        for d in me["domains"]:
            own_hosts.update({d, to_puny(d)})
    other_brands = []
    if me or domain:
        for b in brands:
            if me and b["key"] == me["key"]:
                continue
            doms = [d for d in b["domains"] if d not in own_hosts and to_puny(d) not in own_hosts]
            if doms or b["phones"]:
                other_brands.append({"name": b["name"], "domains": doms, "phones": b["phones"]})

    ctx = {
        "site_root": site_root, "site_type": site_type, "extra_roots": extra_roots,
        "own_hosts": own_hosts, "other_brands": other_brands, "unregistered": {},
    }
    rep = Report()

    if args.files:
        html_files = [os.path.abspath(f) for f in args.files
                      if os.path.splitext(f)[1].lower() in (".html", ".htm") and os.path.isfile(f)]
        text_files = [os.path.abspath(f) for f in args.files if os.path.isfile(f)]
    else:
        html_files = find_files(site_root, {".html", ".htm"})
        text_files = find_files(root, TEXT_EXT)

    for path in html_files:
        check_html(path, os.path.relpath(path, root), cfg, ctx, rep)
    check_secrets(text_files, root, rep)

    for (kind, value), where in sorted(ctx["unregistered"].items()):
        rep.add("참고", where, 0, "%s ID 발견: %s — project.yaml analytics.%s 에 등록하면 불일치 검사가 켜짐"
                % (TRACK_LABEL[kind], value, kind))

    if not args.files:
        for name, level in (("robots.txt", "경고"), ("sitemap.xml", "경고"), ("404.html", "참고")):
            if not any(os.path.isfile(os.path.join(base, name)) for base in [site_root] + extra_roots):
                rep.add(level, name, 0, "%s 없음" % name)
        index = os.path.join(site_root, "index.html")
        if os.path.isfile(index):
            with open(index, encoding="utf-8-sig", errors="replace") as fh:
                body = fh.read()
            if "사업자등록번호" not in body.replace(" ", ""):
                rep.add("참고", "index.html", 0, "푸터에 사업자 정보(사업자등록번호) 문구가 보이지 않음")
        if not (me or domain):
            rep.add("참고", "project.yaml", 0, "brand.key / brand.domain 이 비어 있어 브랜드 분리 검사를 건너뜀")

    counts = {lv: rep.count(lv) for lv in ("오류", "경고", "참고")}
    if args.json:
        print(json.dumps({
            "root": root, "html_files": len(html_files), "counts": counts,
            "items": [{"level": l, "file": f, "line": n, "message": m} for l, f, n, m in rep.items],
        }, ensure_ascii=False, indent=1))
    else:
        print("사이트 점검 — %s (HTML %d개, 유형 %s)" % (root, len(html_files), site_type))
        if cfg.get("brand.name") or domain:
            print("브랜드: %s  도메인: %s" % (cfg.get("brand.name", "-") or "-", domain or "-"))
        levels = ("오류",) if args.errors_only else ("오류", "경고", "참고")
        for level in levels:
            rows = [i for i in rep.items if i[0] == level]
            if not rows:
                continue
            print("\n[%s] %d건" % (level, len(rows)))
            for _, file, line, msg in rows[: args.max]:
                loc = "%s:%d" % (file, line) if line else file
                print("  %s  %s" % (loc, msg))
            if len(rows) > args.max:
                print("  ... 외 %d건 (--max 로 늘릴 수 있음)" % (len(rows) - args.max))
        print("\n요약: 오류 %d · 경고 %d · 참고 %d" % (counts["오류"], counts["경고"], counts["참고"]))
        print("이 스크립트는 관찰만 합니다. 고칠지는 팀장이 판단합니다.")

    if args.strict and counts["오류"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
