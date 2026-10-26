#!/usr/bin/env bash
# fix-schedule.sh -- run from the site root (or: ./fix-schedule.sh /path/to/site)
set -euo pipefail
SITE="${1:-}"
if [ -z "$SITE" ]; then
  if   [ -f "$PWD/build/js/api.js" ]; then SITE="$PWD/build"
  elif [ -f "$PWD/js/api.js" ];       then SITE="$PWD"
  else echo "!! pass the site folder"; exit 1; fi
fi
API="$SITE/js/api.js"
[ -f "$API" ] || { echo "!! no $API"; exit 1; }
PY=$(command -v python3 || command -v python || command -v py || command -v py || command -v py)
[ -n "$PY" ] || { echo "!! python3 required"; exit 1; }

"$PY" - "$API" <<'PYEOF'
import re, sys, os, shutil, subprocess
api = sys.argv[1]
before = open(api, encoding="utf-8").read()
src = before

def sub(pat, repl, label, optional=False):
    global src
    if not optional and repl.strip() and repl.strip() in src:
        print("  already patched: %s" % label); return
    new, n = re.subn(pat, repl, src, count=1)
    if not n:
        print(("  ok: " if optional else "  SKIP (anchor not found): ") + label); return
    src = new
    print("  patched: %s" % label)

# 1. _thin: understand an aliased Page, and reject a body with no lists at all when the
#    caller told us what it expected.
sub(r"function _thin\(data\) \{[\s\S]*?\n\}\n",
r'''function _thin(data, want) {
  if (!data) return true;
  const pages = [];
  for (const v of Object.values(data)) {
    if (!v || typeof v !== 'object') continue;
    pages.push(v.Page || v);                       // Page(...) at the top, or an aliased Page
  }
  const lists = pages.flatMap(p => Object.values(p).filter(Array.isArray));
  if (!lists.length) return !!want;                // nothing list-shaped came back at all
  if (lists.every(l => l.length)) return false;
  const total = pages.reduce((n, p) => n + (p.pageInfo?.total || 0), 0);
  if (total > 0) return true;
  return lists.some(l => l.length);
}
''', "_thin: aliased Page + expect")

# 2. thread expect through _request
sub(r"async function _request\(query, variables, signal\) \{",
    "async function _request(query, variables, signal, expect) {", "_request signature")
sub(r"if \(_thin\(data\)\) \{", "if (_thin(data, expect)) {", "_request thin call")

# 3. thread expect through _gqlLive (gql already forwards opts)
sub(r"function _gqlLive\(query, variables, \{ ttl = TTL\.normal, signal, fresh = false, lazy = false \} = \{\}\) \{",
    "function _gqlLive(query, variables, { ttl = TTL.normal, signal, fresh = false, lazy = false, expect = null } = {}) {",
    "_gqlLive signature")
sub(r"const p = _request\(query, variables, signal\)\.then",
    "const p = _request(query, variables, signal, expect).then", "_gqlLive request call")

# 4. flattener
sub(r"const Api = \{\n",
r'''/* Flatten every aliased Page in a payload into one list. Tolerates a missing field:
   a host can answer 200 with a body that has no airingSchedules at all. */
const _rows = d => (d && typeof d === 'object'
  ? Object.values(d).flatMap(p => (p && p.airingSchedules) || [])
  : []);

const Api = {
''', "_rows helper")

# 5. schedule: unique aliases + tolerant flatten + expect
sub(r"  schedule\(from, to\) \{[\s\S]*?\n  \},\n",
r'''  schedule(from, to) {
    /* Aliases are s1..s3, not a/b/c: a mirror can hand back the weeklyTrending body
       (which also used a/b) for this query. _rows reads whatever actually arrives. */
    return gql(`query Sched($from: Int, $to: Int) {
      s1: Page(page: 1, perPage: 50) { ...Rows }
      s2: Page(page: 2, perPage: 50) { ...Rows }
      s3: Page(page: 3, perPage: 50) { ...Rows }
    }
    fragment Rows on Page {
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
        airingAt episode
        media { id isAdult countryOfOrigin title { romaji english native } }
      }
    }`, { from, to }, { ttl: TTL.normal, expect: 'airingSchedules' })
      .then(d => _rows(d).filter(r => r && (adultOn() || !(r.media && r.media.isAdult))));   // airingSchedules has no isAdult argument, so filter the rows
  },
''', "schedule: unique aliases, tolerant flatten, expect")

if src != before:
    shutil.copyfile(api, api + ".sched.bak")
    open(api, "w", encoding="utf-8").write(src)

node = shutil.which("node")
if node:
    r = subprocess.run([node, "--check", api], capture_output=True, text=True)
    if r.returncode:
        open(api, "w", encoding="utf-8").write(before)
        print("!! api.js does not parse: %s" % (r.stderr.strip().splitlines() or ["?"])[0])
        print("   rolled back"); sys.exit(1)
    print("  node --check: ok")
PYEOF
echo
echo "hard-reload, then check the schedule. ?host=official forces the other host for comparison."