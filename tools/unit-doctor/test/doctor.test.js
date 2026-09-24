// Run: node --test "tools/unit-doctor/test/*.test.js"
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { analyze, parse, timespan } = require("../doctor.js");

const ids = (r) => r.findings.map((f) => f.id);
const find = (r, id) => r.findings.find((f) => f.id === id);
const unit = (...lines) => lines.join("\n") + "\n";

const GOOD = unit(
  "[Unit]", "Description=Example API", "Wants=network-online.target", "After=network-online.target",
  "StartLimitIntervalSec=300", "StartLimitBurst=5", "",
  "[Service]", "Type=exec", "User=api", "WorkingDirectory=/srv/api",
  "ExecStart=/srv/api/.venv/bin/python -u /srv/api/main.py", "Restart=on-failure", "RestartSec=5",
  "NoNewPrivileges=yes", "ProtectSystem=strict", "PrivateTmp=yes", "",
  "[Install]", "WantedBy=multi-user.target");

// the demo unit shown on the page: one of nearly everything
const BROKEN = unit(
  "[Unit]", "Description=Sensor bridge", "After=network-online.target", "",
  "[Service]", "Type=smple", "ExecStart=python3 bridge.py --port 8080 >> ~/bridge.log 2>&1",
  "Environment=MODE=live LABEL=north wing", "Restart=always", "RestartSec=5",
  "StartLimitIntervalSec=60", "StartLimitBurst=3", "Usr=pi", "",
  "[Install]", "WantedBy=multi-user.target");

test("a well-written unit gets an A and no warnings", () => {
  const r = analyze(GOOD);
  assert.equal(r.counts.error, 0, JSON.stringify(r.findings));
  assert.equal(r.counts.warn, 0, JSON.stringify(r.findings));
  assert.equal(r.grade, "A");
  assert.equal(r.kind, "Service");
});

test("shell syntax in ExecStart is caught and wrapped in sh -c", () => {
  const r = analyze(unit("[Service]", "ExecStart=/usr/bin/tail -f /var/log/x | /usr/bin/grep ERR"));
  const f = find(r, "shell-syntax");
  assert.ok(f, ids(r).join());
  assert.equal(f.sev, "error");
  assert.match(r.patched, /ExecStart=\/bin\/sh -c '\/usr\/bin\/tail -f \/var\/log\/x \| \/usr\/bin\/grep ERR'/);
  for (const ok of ["ExecStart=/bin/sh -c 'a | b'", "ExecStart=/usr/bin/foo --opt='a|b'", "ExecStart=/usr/bin/foo --level=2"]) {
    assert.ok(!find(analyze(unit("[Service]", ok)), "shell-syntax"), ok);
  }
  for (const bad of ["ExecStart=/bin/app > /tmp/o", "ExecStart=/bin/a && /bin/b", "ExecStart=/bin/app 2>&1", "ExecStart=/bin/echo $(date)"]) {
    assert.ok(find(analyze(unit("[Service]", bad)), "shell-syntax"), bad);
  }
});

test("crash loop: RestartSec x burst >= interval can never trip the limit", () => {
  const r = analyze(unit("[Service]", "ExecStart=/bin/app", "Restart=always", "RestartSec=5"));
  const f = find(r, "crash-loop");
  assert.ok(f);
  assert.match(f.detail, /5 restarts take at least 25s.*StartLimitIntervalSec=10s/);
  assert.match(r.patched, /\[Unit\]\nStartLimitIntervalSec=120\nStartLimitBurst=5/);
  assert.equal(find(analyze(r.patched), "crash-loop"), undefined, "patched unit must be clean");
  // default RestartSec=100ms: 5 x 0.1s fits in 10s -> limit trips -> fine
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/bin/app", "Restart=always")), "crash-loop"));
  // explicit wide window -> fine
  assert.ok(!find(analyze(unit("[Unit]", "StartLimitIntervalSec=300", "[Service]", "ExecStart=/bin/app", "Restart=on-failure", "RestartSec=5")), "crash-loop"));
});

test("StartLimitIntervalSec in [Service] is ignored (verified on systemd 257)", () => {
  const r = analyze(unit("[Service]", "ExecStart=/bin/app", "Restart=always", "RestartSec=5", "StartLimitIntervalSec=60", "StartLimitBurst=3"));
  assert.equal(find(r, "startlimit-ignored").sev, "error");
  assert.equal(find(r, "legacy-location").line, 6);
  assert.match(find(r, "crash-loop").detail, /ignored, so this is the default/);
  assert.match(r.patched, /\[Unit\]\nStartLimitIntervalSec=60\nStartLimitBurst=3/);
  assert.doesNotMatch(r.patched, /\[Service\][^[]*StartLimit/);
  // the legacy name in [Service] is accepted -> info only
  const r2 = analyze(unit("[Service]", "ExecStart=/bin/app", "StartLimitInterval=60"));
  assert.equal(find(r2, "legacy-location").sev, "info");
});

test("Python daemons without unbuffered output", () => {
  assert.equal(find(analyze(unit("[Service]", "ExecStart=/usr/bin/python3 /opt/a/app.py")), "python-buffered").sev, "warn");
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/usr/bin/python3 -u /opt/a/app.py")), "python-buffered"));
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/usr/bin/python3 -Bu /opt/a/app.py")), "python-buffered"));
  assert.ok(!find(analyze(unit("[Service]", "Environment=PYTHONUNBUFFERED=1", "ExecStart=/opt/a/.venv/bin/python /opt/a/app.py")), "python-buffered"));
  assert.ok(find(analyze(unit("[Service]", "ExecStart=/opt/a/run.py")), "python-buffered"));
  assert.equal(find(analyze(unit("[Service]", "EnvironmentFile=/etc/a.env", "ExecStart=/usr/bin/python3 /opt/a/app.py")), "python-buffered").sev, "info");
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/usr/bin/node /opt/a/app.js")), "python-buffered"));
  const r = analyze(unit("[Service]", "ExecStart=/usr/bin/python3 /opt/a/app.py"));
  assert.match(r.patched, /\[Service\]\nExecStart=.*\nEnvironment=PYTHONUNBUFFERED=1/);
});

test("typos: unknown keys (case-sensitive) and invalid values", () => {
  const r = analyze(unit("[Service]", "ExecStart=/bin/app", "Restatr=always", "execstartpre=/bin/true"));
  const keys = r.findings.filter((f) => f.id === "unknown-key");
  assert.equal(keys.length, 2);
  assert.match(r.patched, /\nRestart=always\n/);
  assert.match(r.patched, /\nExecStartPre=\/bin\/true/);
  const v = analyze(unit("[Service]", "ExecStart=/bin/app", "Restart=allways", "Type=smple", "RestartSec=5x", "NoNewPrivileges=maybe"));
  assert.match(find(v, "bad-value").detail, /never be restarted/);
  assert.equal(v.findings.filter((f) => f.id === "bad-value").length, 3);
  assert.ok(find(v, "bad-timespan"));
  assert.match(v.patched, /Restart=always\nType=simple/);
});

test("keys in the wrong section are moved", () => {
  const r = analyze(unit("[Unit]", "Description=x", "[Service]", "ExecStart=/bin/app", "After=network.target", "[Install]", "WantedBy=multi-user.target"));
  const f = find(r, "wrong-section");
  assert.match(f.title, /After= belongs in \[Unit\]/);
  assert.match(r.patched, /\[Unit\]\nDescription=x\nAfter=network.target\n\[Service\]\nExecStart=\/bin\/app\n\[Install\]/);
});

test("refused configurations: oneshot+always, several ExecStart, none at all", () => {
  assert.ok(find(analyze(unit("[Service]", "Type=oneshot", "ExecStart=/bin/a", "Restart=always")), "oneshot-restart"));
  assert.ok(find(analyze(unit("[Service]", "ExecStart=/bin/a", "ExecStart=/bin/b")), "multi-exec"));
  assert.ok(!find(analyze(unit("[Service]", "Type=oneshot", "ExecStart=/bin/a", "ExecStart=/bin/b")), "multi-exec"));
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/bin/a", "ExecStart=", "ExecStart=/bin/b")), "multi-exec"), "empty assignment resets the list");
  assert.ok(find(analyze(unit("[Service]", "Type=simple")), "no-execstart"));
});

test("~ is never expanded", () => {
  const u = analyze(unit("[Service]", "ExecStart=~/bin/app --x"), { user: true });
  assert.equal(find(u, "tilde").sev, "error");
  assert.match(u.patched, /ExecStart=%h\/bin\/app --x/);
  const s = analyze(unit("[Service]", "User=ana", "ExecStart=~/bin/app"));
  assert.match(s.patched, /ExecStart=\/home\/ana\/bin\/app/);
  assert.ok(find(analyze(unit("[Service]", "EnvironmentFile=~/.env", "ExecStart=/bin/a")), "tilde"));
  assert.ok(!find(analyze(unit("[Service]", "WorkingDirectory=~", "ExecStart=/bin/a")), "tilde"));
});

test("Environment= with an unquoted space is re-quoted", () => {
  const r = analyze(unit("[Service]", "ExecStart=/bin/a", "Environment=MODE=live LABEL=north wing"));
  assert.match(find(r, "env-quoting").detail, /`wing` is dropped/);
  assert.match(r.patched, /Environment=MODE=live "LABEL=north wing"/);
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/bin/a", 'Environment="A=b c" D=e')), "env-quoting"));
});

test("network-online needs both Wants= and After=", () => {
  const r = analyze(unit("[Unit]", "After=network-online.target", "[Service]", "ExecStart=/bin/a"));
  assert.ok(find(r, "network-online"));
  assert.match(r.patched, /After=network-online.target\nWants=network-online.target/);
  assert.ok(find(analyze(unit("[Unit]", "Wants=network-online.target", "[Service]", "ExecStart=/bin/a")), "network-online"));
  assert.ok(!find(analyze(unit("[Unit]", "Wants=network-online.target", "After=network-online.target", "[Service]", "ExecStart=/bin/a")), "network-online"));
});

test("user units: multi-user.target and User= are fatal, root warning is not", () => {
  const src = unit("[Service]", "User=ana", "ExecStart=/bin/a", "[Install]", "WantedBy=multi-user.target");
  const u = analyze(src, { user: true });
  assert.ok(find(u, "user-wantedby"));
  assert.ok(find(u, "user-in-user-unit"));
  assert.ok(!find(u, "runs-as-root"));
  assert.match(u.patched, /WantedBy=default.target/);
  assert.doesNotMatch(u.patched, /User=/);
  const s = analyze(src);
  assert.ok(!find(s, "user-wantedby"));
});

test("date formats: % is a systemd specifier", () => {
  const r = analyze(unit("[Service]", "Type=oneshot", "ExecStart=/usr/bin/date +%Y-%m-%d"));
  assert.ok(find(r, "specifier"));
  assert.match(r.patched, /date \+%%Y-%%m-%%d/);
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/usr/bin/date +%%Y")), "specifier"));
  assert.ok(!find(analyze(unit("[Service]", "ExecStart=/opt/app --instance %i")), "specifier"));
});

test("checks see through an sh -c wrapper", () => {
  const r = analyze(unit("[Service]", "ExecStart=/bin/sh -c 'exec python3 bridge.py >> /var/log/b.log 2>&1'"));
  assert.ok(find(r, "relative-arg"), ids(r).join());
  assert.ok(find(r, "python-buffered"), ids(r).join());
  assert.ok(!find(r, "shell-syntax"));
});

test("relative script path without WorkingDirectory", () => {
  assert.ok(find(analyze(unit("[Service]", "ExecStart=/usr/bin/node server.js")), "relative-arg"));
  assert.ok(!find(analyze(unit("[Service]", "WorkingDirectory=/srv/a", "ExecStart=/usr/bin/node server.js")), "relative-arg"));
  assert.ok(find(analyze(unit("[Service]", "ExecStart=node /srv/a/server.js")), "relative-exe"));
});

test("structure: two type sections, unknown section, junk lines, timers", () => {
  assert.ok(find(analyze(unit("[Service]", "ExecStart=/bin/a", "[Timer]", "OnCalendar=daily")), "two-types"));
  const s = analyze(unit("[Servcie]", "ExecStart=/bin/a"));
  assert.ok(find(s, "unknown-section"));
  assert.match(s.patched, /^\[Service\]/);
  assert.ok(find(analyze(unit("[Service]", "ExecStart=/bin/a", "oops no equals")), "syntax"));
  assert.ok(find(analyze(unit("[Timer]", "Unit=x.service")), "timer-no-trigger"));
  const t = analyze(unit("[Timer]", "OnCalendar=daily", "[Install]", "WantedBy=timers.target"));
  assert.ok(find(t, "timer-persistent"));
  assert.equal(t.kind, "Timer");
});

test("deprecated directives", () => {
  const r = analyze(unit("[Service]", "ExecStart=/bin/a", "MemoryLimit=100M", "CPUShares=512", "KillMode=none"));
  assert.equal(r.findings.filter((f) => f.id === "deprecated").length, 2);
  assert.ok(find(r, "killmode-none"));
  assert.ok(!find(r, "unknown-key"));
  assert.equal(find(analyze(unit("[Unit]", "StartLimitInterval=60", "[Service]", "ExecStart=/bin/a")), "legacy-name").sev, "info");
});

test("parser: continuations, comments, CRLF, empty input", () => {
  const p = parse("[Service]\r\n# c\r\nExecStart=/bin/a \\\r\n  --one \\\r\n  --two\r\n; x\r\n");
  assert.equal(p.entries[0].value, "/bin/a --one --two");
  assert.equal(p.entries[0].line, 3);
  assert.equal(p.entries[0].endLine, 5);
  const e = analyze("");
  assert.equal(e.findings.length, 0);
  assert.equal(e.grade, "—");
});

test("timespan parser matches systemd syntax", () => {
  assert.equal(timespan("5"), 5);
  assert.equal(timespan("500ms"), 0.5);
  assert.equal(timespan("1min 30s"), 90);
  assert.equal(timespan("2h"), 7200);
  assert.equal(timespan("1M"), 2629800);
  assert.equal(timespan("infinity"), Infinity);
  assert.ok(Number.isNaN(timespan("5x")));
  assert.ok(Number.isNaN(timespan("")));
});

test("the page's demo unit: many findings, and the fixed version is clean of all auto-fixable ones", () => {
  const r = analyze(BROKEN);
  for (const id of ["bad-value", "shell-syntax", "env-quoting", "startlimit-ignored", "crash-loop", "unknown-key", "network-online", "python-buffered", "relative-arg"]) {
    assert.ok(find(r, id), "missing " + id + " in " + ids(r).join());
  }
  assert.ok(r.grade === "F" || r.grade === "D");
  const again = analyze(r.patched);
  for (const id of ["bad-value", "shell-syntax", "env-quoting", "startlimit-ignored", "crash-loop", "network-online", "python-buffered"]) {
    assert.ok(!find(again, id), "patched still has " + id);
  }
  assert.ok(find(again, "relative-arg"), "a fix that needs a human (WorkingDirectory=) must still be reported");
  assert.notEqual(again.grade, "A");
  assert.ok(again.score > r.score);
});

test("large input stays fast", () => {
  const big = "[Service]\nExecStart=/bin/a\n" + "Environment=K=v\n".repeat(20000);
  const t = Date.now();
  analyze(big);
  assert.ok(Date.now() - t < 2000);
});

// ---- systemd itself as the referee (skipped where systemd-analyze is absent) ----

function hasAnalyze() {
  try { execFileSync("systemd-analyze", ["--version"], { stdio: "ignore" }); return true; } catch (_) { return false; }
}

test("systemd-analyze verify accepts every auto-fixed unit", { skip: !hasAnalyze() && "systemd-analyze not installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unitdoctor-"));
  const cases = {
    "broken.service": BROKEN,
    "typos.service": unit("[Service]", "ExecStart=/bin/true", "Restatr=always", "Type=smple", "Environment=A=b c"),
    "misplaced.service": unit("[Service]", "ExecStart=/bin/true", "After=network.target", "StartLimitIntervalSec=60"),
  };
  try {
    for (const [name, src] of Object.entries(cases)) {
      const before = verify(dir, name, src);
      const after = verify(dir, name, analyze(src).patched);
      assert.match(before, /Unknown key|Failed to parse|Invalid environment|Refusing/, name + " should start out broken");
      assert.doesNotMatch(after, /Unknown key|Failed to parse|Invalid environment|Refusing|not absolute|Neither a valid/, name + " still broken after fix:\n" + after);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function verify(dir, name, src) {
  const f = path.join(dir, name);
  fs.writeFileSync(f, src);
  const r = spawnSync("systemd-analyze", ["verify", "--man=no", f], { encoding: "utf8" });
  return String(r.stdout || "") + String(r.stderr || "");
}

// ---- the shipped page must not be able to phone home ----

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1").replace(/<!--[\s\S]*?-->/g, "");
}

test("page code makes no network calls and declares a locked-down CSP", () => {
  const dir = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const code = ["doctor.js", "app.js"].map((f) => stripComments(fs.readFileSync(path.join(dir, f), "utf8"))).join("\n");
  for (const bad of ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", "localStorage", "indexedDB", "import("]) {
    assert.ok(!code.includes(bad), "network/storage API in page code: " + bad);
  }
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(stripComments(html)), "inline script would break CSP");
  assert.ok(!/src="https?:|href="https?:\/\/(?!toffler\.dev|github\.com)/.test(html), "external resource in page");
});
