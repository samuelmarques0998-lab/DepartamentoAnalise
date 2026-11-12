#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Oct  3 16:28:45 2026

@author: samuelmarques
"""

"""
Transfermarkt player importer — Python port of importFromTransfermarkt().

Standard library only (no pip installs), so it runs in any online Python
compiler (Programiz, OnlineGDB, Replit, Colab, ...).

What it returns (dict):
    firstName, lastName, name, shirtNumber, position, foot, birthDate, age,
    birthPlace, nationality, heightCm, club, marketValue, contractUntil,
    photo (data: URL), transfermarktId, sourceUrl,
    gamesPlayed, goals, assists, minutesPlayed,      <- from "Desempenho"
    performance = {season, source, url, competitions: [...]}

The live profile draws "Desempenho" with JavaScript, so those numbers come
from Transfermarkt's API (tmapi.transfermarkt.technology); pages that still
have the table in their HTML are parsed directly.

How to test:
    * Run the file and paste a player link, e.g.
      https://www.transfermarkt.pt/cristiano-ronaldo/profil/spieler/8198
    * Press Enter without a link to run the offline demo (useful on online
      compilers that block internet access).
"""

import base64
import gzip
import json
import re
import sys
import unicodedata
import zlib
from datetime import datetime
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen


# ===========================================================================
# 1. Fetching  (the Python equivalent of the JS `proxy()` helper)
# ===========================================================================

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/129.0 Safari/537.36"
)
TIMEOUT_SECONDS = 20
MAX_IMAGE_BYTES = 3 * 1024 * 1024


class FetchError(Exception):
    """Network / HTTP problem (not a problem with the link itself)."""


def proxy(url, referer=None):
    """Fetch a URL and describe it the same way the JS proxy did:
    {"kind": "html", "html": str, "finalUrl": str}
    {"kind": "image", "dataUrl": "data:image/...;base64,...", "finalUrl": str}
    {"kind": "json", "data": object, "finalUrl": str}
    {"kind": "other", "finalUrl": str}
    """
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
    }
    if referer:
        headers["Referer"] = referer

    try:
        with urlopen(Request(url, headers=headers), timeout=TIMEOUT_SECONDS) as resp:
            final_url = resp.geturl()
            content_type = resp.headers.get("Content-Type", "")
            encoding = (resp.headers.get("Content-Encoding") or "").lower()
            raw = resp.read()
    except HTTPError as exc:
        raise FetchError(f"Transfermarkt answered HTTP {exc.code} for {url}") from exc
    except (URLError, OSError) as exc:
        raise FetchError(f"Could not reach {url}: {getattr(exc, 'reason', exc)}") from exc

    if "gzip" in encoding:
        raw = gzip.decompress(raw)
    elif "deflate" in encoding:
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            raw = zlib.decompress(raw, -zlib.MAX_WBITS)

    mime = content_type.split(";")[0].strip().lower()

    if mime.startswith("image/"):
        if len(raw) > MAX_IMAGE_BYTES:
            return {"kind": "other", "finalUrl": final_url}
        b64 = base64.b64encode(raw).decode("ascii")
        return {"kind": "image", "dataUrl": f"data:{mime};base64,{b64}", "finalUrl": final_url}

    if "json" in mime:
        try:
            return {"kind": "json", "data": json.loads(raw.decode("utf-8", "replace")),
                    "finalUrl": final_url}
        except ValueError:
            return {"kind": "other", "finalUrl": final_url}

    if "html" in mime or raw[:200].lstrip().lower().startswith((b"<!doctype html", b"<html")):
        m = re.search(r"charset=([\w-]+)", content_type, re.I)
        charset = m.group(1) if m else "utf-8"
        try:
            text = raw.decode(charset, "replace")
        except LookupError:
            text = raw.decode("utf-8", "replace")
        return {"kind": "html", "html": text, "finalUrl": final_url}

    return {"kind": "other", "finalUrl": final_url}


# ===========================================================================
# 2. Tiny HTML DOM (so we don't need BeautifulSoup)
# ===========================================================================

VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
# Opening one of these closes an unclosed sibling of the listed tags.
AUTO_CLOSE = {
    "td": {"td", "th"},
    "th": {"td", "th"},
    "tr": {"tr", "td", "th"},
    "thead": {"thead", "tbody", "tfoot", "tr", "td", "th"},
    "tbody": {"thead", "tbody", "tfoot", "tr", "td", "th"},
    "tfoot": {"thead", "tbody", "tfoot", "tr", "td", "th"},
    "li": {"li"},
    "p": {"p"},
    "option": {"option"},
}
NO_TEXT_TAGS = {"script", "style", "noscript", "template"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent", "data")

    def __init__(self, tag=None, attrs=None, parent=None, data=None):
        self.tag = tag            # None for text nodes
        self.attrs = attrs or {}
        self.children = []
        self.parent = parent
        self.data = data

    @property
    def classes(self):
        return self.attrs.get("class", "").split()

    def iter(self):
        """All element nodes (self included) in document order."""
        stack = [self]
        while stack:
            node = stack.pop()
            if node.tag is not None:
                yield node
                stack.extend(reversed(node.children))

    def find_all(self, tag=None, cls=None, **attrs):
        out = []
        for node in self.iter():
            if node is self:
                continue
            if tag and node.tag != tag:
                continue
            if cls and cls not in node.classes:
                continue
            if any(node.attrs.get(k.replace("_", "-")) != v for k, v in attrs.items()):
                continue
            out.append(node)
        return out

    def find(self, tag=None, cls=None, **attrs):
        found = self.find_all(tag, cls, **attrs)
        return found[0] if found else None

    def text(self, exclude=()):
        skip = {id(n) for n in exclude}
        parts = []
        stack = list(reversed(self.children))
        while stack:
            node = stack.pop()
            if node.tag is None:
                parts.append(node.data)
            elif node.tag == "br":
                parts.append(" ")
            elif id(node) not in skip and node.tag not in NO_TEXT_TAGS:
                stack.extend(reversed(node.children))
        return " ".join("".join(parts).split())

    def closest(self, tag):
        node = self.parent
        while node is not None:
            if node.tag == tag:
                return node
            node = node.parent
        return None


class _TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#document")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        closes = AUTO_CLOSE.get(tag)
        while closes and len(self.stack) > 1 and self.stack[-1].tag in closes:
            self.stack.pop()
        parent = self.stack[-1]
        node = Node(tag, {k: (v or "") for k, v in attrs}, parent)
        parent.children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        parent = self.stack[-1]
        parent.children.append(Node(tag, {k: (v or "") for k, v in attrs}, parent))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        parent = self.stack[-1]
        parent.children.append(Node(None, None, parent, data))


def build_dom(html_text):
    builder = _TreeBuilder()
    builder.feed(html_text)
    builder.close()
    return builder.root


# ===========================================================================
# 3. Small helpers
# ===========================================================================

def norm(value):
    """lowercase, strip accents, collapse spaces: 'Posição:' -> 'posicao:'"""
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return " ".join(value.lower().split())


def to_int(value):
    """'4' -> 4, '-' -> 0, "230'" -> 230, "1.234'" -> 1234"""
    value = (value or "").strip()
    digits = re.sub(r"\D", "", value)
    return int(digits) if digits else 0


TM_HOST = re.compile(r"(^|\.)transfermarkt\.[a-z]{2,3}(\.[a-z]{2})?$", re.I)


def _with_scheme(url):
    return url if re.match(r"^https?://", url, re.I) else "https://" + url.lstrip("/")


def is_transfermarkt_url(url):
    if not url:
        return False
    parsed = urlparse(_with_scheme(url))
    return bool(TM_HOST.search(parsed.hostname or "")) and bool(
        re.search(r"/spieler/\d+", parsed.path)
    )


def to_profile_url(url):
    """Any player sub-page (leistungsdaten, marktwertverlauf, ...) -> profile page."""
    parsed = urlparse(_with_scheme(url))
    m = re.match(r"^(/[^/]+)/[^/]+/spieler/(\d+)", parsed.path)
    path = f"{m.group(1)}/profil/spieler/{m.group(2)}" if m else parsed.path
    return urlunparse(("https", parsed.netloc, path, "", "", ""))


# ===========================================================================
# 4. Player header parsing (name, photo, info table)
# ===========================================================================

LABELS = {
    "birth": ("data de nascimento", "date of birth", "geb./alter", "geburtsdatum", "fecha de nacimiento"),
    "birthPlace": ("local de nascimento", "place of birth", "geburtsort", "lugar de nacimiento"),
    "height": ("altura", "height", "grosse"),
    "nationality": ("nacionalidade", "citizenship", "nationalitat", "nacionalidad"),
    "position": ("posicao", "position", "posicion"),
    "foot": ("pe", "foot", "fuss", "pie"),
    "club": ("clube atual", "current club", "aktueller verein", "club actual"),
    "contract": ("contrato ate", "contract expires", "vertrag bis", "contrato hasta"),
}


def _label_key(label):
    label = norm(label).rstrip(":").strip()
    for key, options in LABELS.items():
        if any(label == opt or label.startswith(opt + "/") or label.startswith(opt + " ")
               for opt in options):
            return key
    return None


def _collect_labels(root):
    """Map of field -> value Node from the info table and the header labels."""
    found = {}

    # Info table: <span class="info-table__content--regular">Label:</span>
    #             <span class="info-table__content--bold">Value</span>
    pending = None
    for node in root.iter():
        if node.tag != "span":
            continue
        cls = node.classes
        if "info-table__content--regular" in cls:
            pending = _label_key(node.text())
        elif "info-table__content--bold" in cls and pending:
            found.setdefault(pending, node)
            pending = None

    # Header: <li class="data-header__label">Label: <span class="data-header__content">Value</span></li>
    for li in root.find_all("li", cls="data-header__label"):
        content = li.find("span", cls="data-header__content") or li.find("span")
        if content is None:
            continue
        key = _label_key(li.text(exclude=[content]))
        if key:
            found.setdefault(key, content)
    return found


def _countries(node):
    if node is None:
        return []
    flags = [img.attrs.get("title") or img.attrs.get("alt") for img in node.find_all("img")]
    flags = [f.strip() for f in flags if f and f.strip()]
    return flags or ([node.text()] if node.text() else [])


def _parse_birth(text):
    text = text or ""
    age = re.search(r"\((\d{1,2})\)", text)
    age = int(age.group(1)) if age else None
    m = re.search(r"(\d{1,2})[./](\d{1,2})[./](\d{4})", text)
    if m:
        day, month, year = (int(x) for x in m.groups())
        return f"{year:04d}-{month:02d}-{day:02d}", age
    bare = re.sub(r"\(.*?\)", "", text).strip()
    for fmt in ("%b %d, %Y", "%d %b %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(bare, fmt).strftime("%Y-%m-%d"), age
        except ValueError:
            pass
    return bare, age


def _parse_height_cm(text):
    m = re.search(r"(\d)[,.](\d{2})\s*m", text or "")
    return int(m.group(1)) * 100 + int(m.group(2)) if m else None


def _meta(root, prop):
    for meta in root.find_all("meta"):
        if meta.attrs.get("property") == prop or meta.attrs.get("name") == prop:
            return meta.attrs.get("content", "")
    return ""


def _parse_name(root):
    h1 = root.find("h1", cls="data-header__headline-wrapper") or root.find("h1")
    shirt = ""
    if h1 is not None:
        number = h1.find("span", cls="data-header__shirt-number")
        strong = h1.find("strong")
        if number is not None:
            shirt = re.sub(r"\D", "", number.text())
        skip = [n for n in (number, strong) if n is not None]
        first = h1.text(exclude=skip)
        last = strong.text() if strong is not None else ""
        if not last:
            parts = first.split()
            first, last = " ".join(parts[:-1]), (parts[-1] if parts else "")
        if first or last:
            return first.strip(), last.strip(), shirt

    # Fallback: <meta property="og:title" content="Name - Perfil do jogador ...">
    title = _meta(root, "og:title").split(" - ")[0].split("|")[0].strip()
    parts = title.split()
    return " ".join(parts[:-1]), (parts[-1] if parts else ""), shirt


def _parse_photo(root, base_url):
    img = root.find("img", cls="data-header__profile-image")
    src = ""
    if img is not None:
        src = img.attrs.get("src") or img.attrs.get("data-src") or ""
    if not src:
        src = _meta(root, "og:image")
    if not src or "default" in src.lower():
        return ""
    return urljoin(base_url, src)


# ===========================================================================
# 5. Performance ("Desempenho") table parsing
# ===========================================================================

TARGETS = ("games", "goals", "assists", "minutes")
OUTPUT_KEYS = {"games": "gamesPlayed", "goals": "goals", "assists": "assists", "minutes": "minutesPlayed"}

# Order matters: the first rule that matches a column header wins.
COLUMN_RULES = [
    ("ignore", re.compile(
        r"autogol|eigentor|own.?goal|sofrid|gegentor|conceded|clean.?sheet|zu.?null|"
        r"sem sofrer|amarel|vermelh|yellow|red.?card|karte|cartao|cartoes|card|"
        r"suplent|substitut|eingewechselt|ausgewechselt|penalt|elfmeter|punkte|pontos")),
    ("minutesPerGoal", re.compile(
        r"por golo|por gol|pro tor|pro-tor|per goal|per-goal|minuten.?pro.?tor|min.?/.?gol")),
    ("minutes", re.compile(r"minut")),
    ("assists", re.compile(r"assist|vorlage")),
    ("goals", re.compile(r"golo|\bgols?\b|\btore\b|\btor\b|goal")),
    ("games", re.compile(r"jogo|einsatz|einsaetze|einsatze|spiele|appearance|\bapps?\b|match|partida")),
]
STAT_VALUE = re.compile(r"^(?:[-–—]|\d[\d.\s]*'?|\d[\d.\s]*\s*min\.?)$")
HEADLINE = re.compile(r"^(desempenho|leistungsdaten|performance|estatisticas|stats)\b")


def _signature(cell):
    """Everything that can describe a header cell: titles, alts, classes, icon names, text."""
    if cell is None:
        return ""
    bits = []
    for node in cell.iter():
        for attr in ("title", "alt", "aria-label", "class", "src", "href", "xlink:href",
                     "data-title", "data-tooltip", "data-original-title"):
            bits.append(node.attrs.get(attr, ""))
    bits.append(cell.text())
    return norm(" ".join(bits))


def _classify(signature):
    for field, rule in COLUMN_RULES:
        if rule.search(signature):
            return field
    return None


def _expand(cells):
    """Repeat-for-colspan so header and body columns line up."""
    out = []
    for cell in cells:
        try:
            span = max(1, min(int(cell.attrs.get("colspan") or 1), 20))
        except ValueError:
            span = 1
        out.append(cell)
        out.extend([None] * (span - 1))
    return out


def _table_rows(table):
    head, body = [], []
    for tr in table.find_all("tr"):
        if tr.closest("table") is not table:
            continue  # row of a nested table
        cells = [c for c in tr.children if c.tag in ("td", "th")]
        if not cells:
            continue
        if tr.closest("thead") is not None or (not body and all(c.tag == "th" for c in cells)):
            head.append(cells)
        else:
            body.append(cells)
    return (head[-1] if head else []), body


def parse_stats_table(table, allow_positional=True):
    """Read games / goals / assists / minutes out of a Transfermarkt stats table."""
    header, rows = _table_rows(table)
    if not rows:
        return None

    hdr = _expand(header)
    body = [_expand(r) for r in rows]
    width = len(hdr) or max(len(r) for r in body)

    def cell_at(row, col):  # header column -> body cell (right-aligned if widths differ)
        idx = col + (len(row) - width)
        return row[idx] if 0 <= idx < len(row) else None

    # 1) Identify columns from header titles / icons
    columns = {}
    for col, cell in enumerate(hdr):
        field = _classify(_signature(cell))
        if field in TARGETS and field not in columns:
            columns[field] = col
    matched_by = "headers"

    # 2) Fallback: column order seen on the profile box
    #    [competition] games | goals | assists | minutes-per-goal | minutes
    if sum(f in columns for f in TARGETS) < 2:
        if not allow_positional:
            return None
        stat_cols = []
        for col in range(width):
            values = [cell_at(r, col) for r in body]
            values = [v.text() if v is not None else "" for v in values]
            if values and all(v and STAT_VALUE.match(v) for v in values):
                stat_cols.append(col)
        if len(stat_cols) < 2:
            return None
        columns = {"games": stat_cols[0], "goals": stat_cols[1]}
        if len(stat_cols) >= 3:
            columns["assists"] = stat_cols[2]
        if len(stat_cols) >= 4:
            columns["minutes"] = stat_cols[-1]
        matched_by = "position"

    competitions, totals, total_label = [], None, ""
    for row in body:
        record = {}
        for field in TARGETS:
            cell = cell_at(row, columns[field]) if field in columns else None
            record[field] = to_int(cell.text()) if cell is not None else None
        if all(record[f] is None for f in columns):
            continue  # "no data" / spacer row

        texts = [c.text() for c in row if c is not None and c.text()]
        label = next((t for t in texts if not STAT_VALUE.match(t)), "")
        if norm(label).startswith("total"):
            totals, total_label = record, label
            continue
        if not label:
            img = next((c.find("img") for c in row if c is not None and c.find("img")), None)
            label = (img.attrs.get("title") or img.attrs.get("alt") or "") if img else ""
        competitions.append({"competition": label, **record})

    if totals is None:
        totals = {}
        for field in TARGETS:
            values = [c[field] for c in competitions if c[field] is not None]
            totals[field] = sum(values) if values else None

    season = re.search(r"\d{2}/\d{2}|\b\d{4}\b", total_label)
    return {
        **{f: totals.get(f) for f in TARGETS},
        "competitions": competitions,
        "season": season.group(0) if season else None,
        "matchedBy": matched_by,
    }


def _is_perf_headline(node):
    if node.tag not in ("h1", "h2", "h3", "h4") and not any("headline" in c for c in node.classes):
        return False
    text = norm(node.text())
    return len(text) <= 40 and bool(HEADLINE.match(text))


def parse_profile_performance(root):
    """The 'Desempenho' box on the profile page (as in the screenshot)."""
    nodes = list(root.iter())
    for i, node in enumerate(nodes):
        if not _is_perf_headline(node):
            continue
        for nxt in nodes[i + 1:]:
            if nxt.tag == "h2" and nxt is not node and not _is_perf_headline(nxt):
                break  # reached the next box
            if nxt.tag == "table":
                stats = parse_stats_table(nxt, allow_positional=True)
                if stats:
                    if not stats["season"]:
                        m = re.search(r"\d{2}/\d{2}", node.text())
                        stats["season"] = m.group(0) if m else None
                    return stats
    return None


def find_performance_url(root, base_url):
    """URL behind 'Dados de desempenho completos' (or the /leistungsdaten/ page)."""
    for a in root.find_all("a"):
        if "desempenho completo" in norm(a.text()) or "full performance" in norm(a.text()):
            if a.attrs.get("href"):
                return urljoin(base_url, a.attrs["href"])
    for a in root.find_all("a"):
        href = a.attrs.get("href", "")
        if re.search(r"/leistungsdaten/spieler/\d+/?$", href):
            return urljoin(base_url, href)
    if "/profil/spieler/" in base_url:
        return base_url.replace("/profil/spieler/", "/leistungsdaten/spieler/")
    return None


def parse_performance_page(page_html):
    """The full stats page (/leistungsdaten/), used if the profile box is missing."""
    root = build_dom(page_html)
    tables = root.find_all("table")
    tables.sort(key=lambda t: "items" not in t.classes)  # classic TM tables first
    for table in tables:
        stats = parse_stats_table(table, allow_positional=False)
        if stats and stats["games"] is not None:
            return stats
    return None


# ===========================================================================
# 5b. Performance from Transfermarkt's API
#     The live site draws the "Desempenho" box with JavaScript
#     (<tm-player-performance-table-new>), so the HTML has no numbers in it.
#     These rules copy that component: each competition counts only its
#     current season, national-team games are left out, and with no games
#     this season it shows the whole career instead.
# ===========================================================================

TMAPI = "https://tmapi.transfermarkt.technology"
NATIONAL_TEAM_TYPES = {11, 17, 19, 20}   # competitionTypeId
ALWAYS_CURRENT = {"FIWC"}                # kept even if its season is older than the page's


def _api(path, query=None, referer=None):
    url = TMAPI + path + ("?" + urlencode(query, doseq=True) if query else "")
    resp = proxy(url, referer=referer)
    body = resp.get("data") if resp["kind"] == "json" else None
    if not isinstance(body, dict) or not body.get("success") or body.get("data") is None:
        raise FetchError(f"Transfermarkt API returned no data for {path}")
    return body["data"]


def profile_season(page_html):
    """Season the profile box shows: <tm-player-performance-table-new season="2026" table-type="profile">"""
    for tag in re.findall(r"<tm-player-performance-table-new\b[^>]*>", page_html or "", re.I):
        if re.search(r'\btable-type="profile"', tag):
            m = re.search(r'(?<![\w-])season="(\d{4})"', tag)
            if m:
                return int(m.group(1))
    return None


def summarize_performance(games, competitions, season_id=None):
    """Per-game API rows -> the same dict parse_stats_table() returns."""
    def info(g):
        return g.get("gameInformation") or {}

    club_games = [g for g in games if info(g).get("competitionTypeId") not in NATIONAL_TEAM_TYPES]
    if season_id is None and club_games:  # no season on the page: use the latest game's
        latest = max(club_games, key=lambda g: (info(g).get("date") or {}).get("dateTimeUTC") or "")
        season_id = info(latest).get("seasonId")

    def this_season(g):
        comp = competitions.get(str(info(g).get("competitionId")))
        current = (comp or {}).get("currentSeasonId")
        if not current or info(g).get("seasonId") != current:
            return False
        return current >= (season_id or 0) or info(g).get("competitionId") in ALWAYS_CURRENT

    picked = [g for g in club_games if this_season(g)]
    career = not picked
    if career:
        picked = club_games
    if not picked:
        return None

    rows = {}
    for g in picked:
        comp_id = str(info(g).get("competitionId"))
        stats = g.get("statistics") or {}
        goal_stats = stats.get("goalStatistics") or {}
        comp = competitions.get(comp_id) or {}
        row = rows.setdefault(comp_id, {
            "competition": comp.get("shortName") or comp.get("name") or comp_id,
            "games": 0, "goals": 0, "assists": 0, "minutes": 0,
        })
        if (stats.get("generalStatistics") or {}).get("participationState") == "played":
            row["games"] += 1
        row["goals"] += goal_stats.get("goalsScoredTotal") or 0
        row["assists"] += goal_stats.get("assists") or 0
        row["minutes"] += (stats.get("playingTimeStatistics") or {}).get("playedMinutes") or 0

    competitions_out = sorted(rows.values(), key=lambda r: (-r["games"], -r["goals"], -r["assists"]))
    seasons = [(info(g).get("season") or {}).get("display") for g in picked]
    return {
        **{f: sum(r[f] for r in competitions_out) for f in TARGETS},
        "competitions": competitions_out,
        "season": None if career else next((s for s in seasons if s), None),
        "matchedBy": "api",
        "career": career,
    }


def fetch_performance(player_id, season_id=None, referer=None):
    data = _api(f"/player/{player_id}/performance-game", referer=referer)
    games = data.get("performance") or []
    ids = sorted({str(info.get("competitionId"))
                  for info in (g.get("gameInformation") or {} for g in games)
                  if info.get("competitionId")})
    competitions = {}
    for i in range(0, len(ids), 100):
        for comp in _api("/competitions", {"ids[]": ids[i:i + 100]}, referer=referer):
            competitions[str(comp.get("id"))] = comp
    return summarize_performance(games, competitions, season_id)


# ===========================================================================
# 6. parseTransfermarkt + importFromTransfermarkt
# ===========================================================================

def parse_transfermarkt(page_html, url):
    root = build_dom(page_html)
    first, last, shirt = _parse_name(root)
    labels = _collect_labels(root)

    def label_text(key):
        node = labels.get(key)
        return node.text() if node is not None else ""

    birth_date, age = _parse_birth(
        (root.find("span", itemprop="birthDate") or labels.get("birth") or Node()).text()
    )
    nat_node = root.find("span", itemprop="nationality") or labels.get("nationality")
    countries = _countries(labels.get("nationality") or nat_node)

    club_node = root.find("span", cls="data-header__club")
    club = ""
    if club_node is not None:
        link = club_node.find("a")
        club = (link.attrs.get("title") if link is not None else "") or club_node.text()
    club = club or label_text("club")

    club_url = ""  # e.g. https://www.transfermarkt.pt/sunderland-afc/startseite/verein/289
    if club_node is not None:
        club_link = club_node.find("a")
        if club_link is not None and club_link.attrs.get("href"):
            club_url = urljoin(url, club_link.attrs["href"])

    market = root.find("a", cls="data-header__market-value-wrapper")
    market_value = ""
    if market is not None:
        market_value = re.split(r"(?i)\b(?:[uú]ltima|last update|letzte)", market.text())[0].strip()

    tm_id = re.search(r"/spieler/(\d+)", url)

    data = {
        "firstName": first,
        "lastName": last,
        "name": " ".join(p for p in (first, last) if p),
        "shirtNumber": shirt,
        "position": label_text("position"),
        "foot": label_text("foot"),
        "birthDate": birth_date,
        "age": age,
        "birthPlace": label_text("birthPlace"),
        "nationality": countries[0] if countries else "",
        "nationalities": countries,
        "heightCm": _parse_height_cm(
            (root.find("span", itemprop="height") or labels.get("height") or Node()).text()
        ),
        "club": club.strip(),
        "clubUrl": club_url,
        "marketValue": market_value,
        "contractUntil": label_text("contract"),
        "photo": _parse_photo(root, url),
        "transfermarktId": tm_id.group(1) if tm_id else "",
        "sourceUrl": url,
    }

    # Original remote photo URL (data["photo"] may later become an embedded data URL).
    data["photoUrl"] = data["photo"]

    stats = parse_profile_performance(root)
    _apply_stats(data, stats, source="profile" if stats else None)
    data["performance"]["url"] = find_performance_url(root, url)
    return data


def _apply_stats(data, stats, source):
    stats = stats or {}
    for field, key in OUTPUT_KEYS.items():
        data[key] = stats.get(field)
    data["performance"] = {
        "season": stats.get("season"),
        "source": source,
        "url": (data.get("performance") or {}).get("url"),
        "competitions": [
            {"competition": c["competition"], **{OUTPUT_KEYS[f]: c[f] for f in TARGETS}}
            for c in stats.get("competitions", [])
        ],
    }


def import_from_transfermarkt(url, embed_photo=True):
    clean = str(url or "").strip()
    if not is_transfermarkt_url(clean):
        raise ValueError("Paste a player link from transfermarkt.pt")
    clean = to_profile_url(clean)

    page = proxy(clean)
    if page["kind"] != "html" or not page.get("html"):
        raise ValueError("That link did not return a player page")

    final_url = page.get("finalUrl") or clean
    data = parse_transfermarkt(page["html"], final_url)
    if not data["firstName"] and not data["lastName"]:
        raise ValueError("Could not read a player from that page — check the link")

    # The live "Desempenho" box is drawn by JavaScript: get its numbers from the API.
    if data["gamesPlayed"] is None and data["transfermarktId"]:
        try:
            stats = fetch_performance(data["transfermarktId"], profile_season(page["html"]),
                                      referer=final_url)
        except (FetchError, AttributeError, KeyError, TypeError, ValueError):
            stats = None  # stats are optional; the rest of the player is still usable
        if stats:
            _apply_stats(data, stats, source="api (career)" if stats["career"] else "api")

    # Still nothing? Read the full performance page instead.
    perf_url = data["performance"]["url"]
    if data["gamesPlayed"] is None and perf_url:
        try:
            perf_page = proxy(perf_url, referer=final_url)
            if perf_page["kind"] == "html":
                stats = parse_performance_page(perf_page["html"])
                if stats:
                    _apply_stats(data, stats, source="performance page")
        except FetchError:
            pass  # stats stay None; the rest of the player is still usable

    # Resolve the remote photo to an embedded data URL (keeps players offline-safe).
    # With embed_photo=False the photo stays as the plain https URL (and no download happens).
    if embed_photo and data["photo"] and re.match(r"^https?:", data["photo"], re.I):
        try:
            img = proxy(data["photo"], referer=final_url)
            data["photo"] = img["dataUrl"] if img["kind"] == "image" else ""
        except FetchError:
            data["photo"] = ""  # refused — drop rather than store a hotlink

    return data


# Same name as the JS version, if you prefer camelCase calls.
importFromTransfermarkt = import_from_transfermarkt


# ===========================================================================
# 7. Vercel endpoint: GET /api/transfermarkt?url=<player or team link>
#    Só para utilizadores do departamento (papel "departamento" na tabela perfis).
#    Não guarda nada: devolve os dados e a app grava-os no Supabase.
#    O URL e a chave pública (anon) podem vir das variáveis de ambiente da
#    Vercel (SUPABASE_URL, SUPABASE_ANON_KEY); senão usam-se os valores abaixo.
# ===========================================================================

import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

SB_URL = os.environ.get("SUPABASE_URL") or "https://ciyvgscuqmtcqttiakaj.supabase.co"
SB_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeXZnc2N1cW10Y3F0dGlha2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDY5NDMsImV4cCI6MjEwODUyMjk0M30.9kmr5az3gUrws_QXTa9PZakpgZJrAKUefI3t_Z9-ZNg"


def is_editor(token):
    """True se o token pertence a um utilizador com papel "departamento".
    Usa a função public.e_departamento() do schema.sql, que lê o perfil do próprio utilizador."""
    if not token:
        return False
    req = Request(SB_URL.rstrip("/") + "/rest/v1/rpc/e_departamento", data=b"{}", method="POST",
                  headers={"apikey": SB_ANON_KEY, "Authorization": "Bearer " + token,
                           "Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode("utf-8")) is True
    except (HTTPError, URLError, OSError, ValueError):
        return False


def is_team_url(url):
    parsed = urlparse(_with_scheme(url))
    return bool(TM_HOST.search(parsed.hostname or "")) and bool(re.search(r"/verein/\d+", parsed.path))


def is_match_url(url):
    parsed = urlparse(_with_scheme(url))
    return bool(TM_HOST.search(parsed.hostname or "")) and bool(re.search(r"/spielbericht/(index/spielbericht/)?\d+", parsed.path))


def to_squad_url(url):
    parsed = urlparse(_with_scheme(url))
    m = re.match(r"^(/[^/]+)/[^/]+/verein/(\d+)", parsed.path)
    path = f"{m.group(1)}/kader/verein/{m.group(2)}" if m else parsed.path
    return urlunparse(("https", parsed.netloc, path, "", "", ""))


def parse_squad(page_html, origin):
    root = build_dom(page_html)
    tables = [t for t in root.find_all("table") if "items" in t.classes]
    seen = {}
    for scope in tables or [root]:
        for a in scope.find_all("a"):
            href = a.attrs.get("href", "")
            m = re.match(r"^/[^/]+/profil/spieler/(\d+)", href)
            if not m:
                continue
            pid, name = m.group(1), a.text() or a.attrs.get("title", "")
            if pid not in seen or (name and not seen[pid]["name"]):
                seen[pid] = {"name": name, "url": urljoin(origin, href)}
    return [{**v, "name": v["name"] or "Jogador"} for v in seen.values()]


class handler(BaseHTTPRequestHandler):
    def _send(self, status, body):
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        auth = self.headers.get("Authorization", "")
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        if not is_editor(token):
            self._send(403, {"ok": False, "erro": "Só utilizadores do departamento podem importar jogadores."})
            return
        url = (parse_qs(urlparse(self.path).query).get("url") or [""])[0].strip()
        try:
            if is_match_url(url):
                # Ficha de jogo: a app lê o onze no próprio browser, aqui só se vai buscar a página.
                page = proxy(_with_scheme(url))
                html = page.get("html", "") if page.get("kind") == "html" else ""
                if "formation-subtitle" not in html and "aufstellung" not in html:
                    self._send(422, {"ok": False, "erro": "Essa página não tem os onzes. Confirma o link da ficha de jogo."})
                else:
                    self._send(200, {"ok": True, "ficha": html})
            elif is_transfermarkt_url(url):
                data = import_from_transfermarkt(url, embed_photo=True)
                self._send(200, {"ok": True, "jogador": {k: data.get(k) for k in (
                    "name", "shirtNumber", "position", "foot", "birthDate", "heightCm", "nationality", "club",
                    "photo", "transfermarktId", "sourceUrl", "gamesPlayed", "goals", "assists", "minutesPlayed")}})
            elif is_team_url(url):
                page = proxy(to_squad_url(url))
                final = urlparse(page.get("finalUrl") or to_squad_url(url))
                squad = parse_squad(page.get("html", ""), f"{final.scheme}://{final.netloc}") if page["kind"] == "html" else []
                if not squad:
                    self._send(422, {"ok": False, "erro": "Não encontrei jogadores nessa página. Confirma o link da equipa."})
                else:
                    self._send(200, {"ok": True, "equipa": squad})
            else:
                self._send(400, {"ok": False, "erro": "Cola um link de jogador, de equipa ou de ficha de jogo do Transfermarkt."})
        except ValueError:
            self._send(422, {"ok": False, "erro": "Não consegui ler esse link. Confirma se é o certo."})
        except FetchError:
            self._send(502, {"ok": False, "erro": "O Transfermarkt não respondeu. Tenta daqui a pouco."})
