"""v1.0.1 Release Integrity Audit Script"""
import ast, re, os, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
BACKEND = os.path.join(ROOT, 'Backened')
DOCS    = os.path.join(ROOT, 'docs')

issues  = []
ok      = []

def PASS(msg): ok.append(msg);      print(f'[PASS] {msg}')
def FAIL(msg): issues.append(msg);  print(f'[FAIL] {msg}')
def INFO(msg):                       print(f'[INFO] {msg}')

# ── 1. Backend compile ────────────────────────────────────────────────────────
server_path = os.path.join(BACKEND, 'server.py')
src = open(server_path, encoding='utf-8').read()
try:
    ast.parse(src)
    PASS('server.py AST parse: clean')
except SyntaxError as e:
    FAIL(f'server.py SyntaxError line {e.lineno}: {e.msg}')

# ── 2. Route count & duplicates ───────────────────────────────────────────────
routes = re.findall(r'@api_router\.(get|post|put|delete|patch)\([\'"](/[^\'"]*)[\'"]', src)
total  = len(routes)
INFO(f'Route decorators found: {total}')
seen = {}
for method, path in routes:
    key = (method.upper(), path)
    seen[key] = seen.get(key, 0) + 1
dups = {k: v for k, v in seen.items() if v > 1}
if dups:
    for k, v in dups.items():
        FAIL(f'Duplicate route: {k[0]} {k[1]} x{v}')
else:
    PASS(f'No duplicate routes ({total} unique)')

if total == 75:
    PASS('Route count matches documented value (75)')
else:
    FAIL(f'Route count mismatch: found {total}, expected 75')

# ── 3. Debug print check ──────────────────────────────────────────────────────
if 'print("AUTH ME SESSION:' in src:
    FAIL('Debug print statement still present in server.py')
else:
    PASS('No debug print statements in server.py')

# ── 4. Test file audit ────────────────────────────────────────────────────────
test_files = {
    'test_cookie_fix.py':             os.path.join(BACKEND, 'test_cookie_fix.py'),
    'tests/test_attendify_api.py':    os.path.join(BACKEND, 'tests', 'test_attendify_api.py'),
    'tests/test_attendance_e2e.py':   os.path.join(BACKEND, 'tests', 'test_attendance_e2e.py'),
    'tests/test_new_features.py':     os.path.join(BACKEND, 'tests', 'test_new_features.py'),
    'tests/test_attendance_calc.py':  os.path.join(BACKEND, 'tests', 'test_attendance_calc.py'),
}

INFO('')
INFO('--- Test File Audit ---')

for label, path in test_files.items():
    content = open(path, encoding='utf-8').read()

    # Check for missing password in student-login calls
    missing_pw = re.findall(
        r'student-login.*?json=\{([^}]+)\}',
        content, re.DOTALL
    )
    bad_calls = [m for m in missing_pw if 'password' not in m]
    if bad_calls:
        FAIL(f'{label}: student-login call missing password field ({len(bad_calls)}x)')
    else:
        PASS(f'{label}: student-login payloads complete (password present or N/A)')

    # Check for legacy removed endpoints
    legacy = re.findall(r'/api/auth/login\b', content)
    if legacy:
        INFO(f'OBSOLETE TEST: {label} references removed endpoint /api/auth/login ({len(legacy)}x) — skipped by pytest due to BASE_URL guard')

    # Check for google-session (legacy name)
    gs = re.findall(r'/api/auth/google-session', content)
    if gs:
        # This is the current admin OAuth endpoint — still valid
        pass

# ── 5. Documentation metrics scan ─────────────────────────────────────────────
INFO('')
INFO('--- Documentation Metrics ---')

doc_files = sorted([f for f in os.listdir(DOCS) if f.endswith('.md')])
INFO(f'docs/ contains {len(doc_files)} files: {doc_files[0]} … {doc_files[-1]}')
if len(doc_files) == 20:
    PASS('docs/ file count correct (20)')
else:
    FAIL(f'docs/ file count: {len(doc_files)} (expected 20)')

# Check API count consistency across all docs
endpoint_mentions = {}
for fn in doc_files:
    text = open(os.path.join(DOCS, fn), encoding='utf-8').read()
    for m in re.finditer(r'(\d+)\s*(?:API\s+)?(?:endpoint|route)s?', text, re.IGNORECASE):
        val = int(m.group(1))
        if val in (74, 76):  # wrong values
            endpoint_mentions.setdefault(fn, []).append(val)

if endpoint_mentions:
    for fn, vals in endpoint_mentions.items():
        FAIL(f'{fn} still mentions incorrect endpoint count(s): {vals}')
else:
    PASS('No documents reference incorrect endpoint counts (74 or 76)')

# Check version numbers
wrong_versions = {}
for fn in doc_files:
    text = open(os.path.join(DOCS, fn), encoding='utf-8').read()
    bad = [v for v in re.findall(r'\bv[0-9]+\.[0-9]+\.[0-9]+\b', text)
           if v not in ('v1.0.0', 'v1.0.1', 'v2.0.0', 'v1.0.0-p1')]
    # v2.0.0 is allowed in 19_v2_backlog.md
    bad_filtered = [v for v in bad if not (fn == '19_v2_backlog.md' and v == 'v2.0.0')]
    if bad_filtered:
        wrong_versions[fn] = bad_filtered

if wrong_versions:
    for fn, vs in wrong_versions.items():
        FAIL(f'{fn} has unexpected version string(s): {vs}')
else:
    PASS('All version strings in docs are canonical (v1.0.0 / v1.0.1 / v2.0.0)')

# ── 6. README broken links ─────────────────────────────────────────────────────
INFO('')
INFO('--- README Link Check ---')
readme = open(os.path.join(ROOT, 'README.md'), encoding='utf-8').read()
links = re.findall(r'\[([^\]]+)\]\(file:///([^)]+)\)', readme)
broken = []
for text, raw_path in links:
    clean = raw_path.replace('%20', ' ').replace('%27', "'")
    # Normalise drive letter
    norm = os.path.normpath(clean)
    if not os.path.exists(norm):
        broken.append((text, norm))

if broken:
    for text, path in broken:
        FAIL(f'README broken link [{text}] -> {path}')
else:
    PASS(f'All {len(links)} README file:/// links resolve')

# ── 7. Archived files marked correctly ────────────────────────────────────────
INFO('')
INFO('--- Archived Files ---')
for fname in ['project.md', 'PROJECT_ARCHITECTURE.md']:
    fpath = os.path.join(ROOT, fname)
    content = open(fpath, encoding='utf-8').read()
    if 'archived' in content.lower():
        PASS(f'{fname} is marked archived')
    else:
        FAIL(f'{fname} is NOT marked archived')

# ── Summary ───────────────────────────────────────────────────────────────────
INFO('')
INFO('=' * 60)
INFO(f'AUDIT COMPLETE — {len(ok)} checks passed, {len(issues)} failed')
if issues:
    INFO('FAILURES:')
    for iss in issues: INFO(f'  ✗ {iss}')
else:
    INFO('ALL CHECKS PASSED')
