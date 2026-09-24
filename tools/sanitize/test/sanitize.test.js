// Run: node --test "tools/sanitize/test/*.test.js"
// Fake credentials are assembled from fragments so no scanner (GitHub push
// protection, gitleaks) ever sees a whole token pattern in this public repo.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sanitize, restore, _luhn, _iban } = require("../sanitize.js");

const rep = (s, n) => s.repeat(n);
const FAKE = {
  anthropic: "sk-" + "ant-" + "api03-" + "Ab3" + rep("xY9", 10),
  openai: "sk-" + "proj-" + "Q7" + rep("aBc4", 8),
  github: "gh" + "p_" + rep("A1b2", 9),
  aws: "AK" + "IA" + "Z7QX4MPL2VWN8RTE",
  google: "AI" + "za" + "Sy" + rep("B2c", 11),
  slack: "xo" + "xb-" + "1234567890-" + rep("ab", 8),
  stripe: "sk_" + "live_" + rep("4eC3", 6),
  jwt: "ey" + "JhbGciOiJIUzI1NiJ9" + "." + "ey" + "JzdWIiOiIxMjM0NSJ9" + "." + "c2lnbmF0dXJlX2hlcmU",
};

function types(r) { return r.findings.map((f) => f.type); }

test("provider tokens are caught with their specific type", () => {
  for (const [kind, type] of [
    ["anthropic", "ANTHROPIC_KEY"], ["openai", "OPENAI_KEY"], ["github", "GITHUB_TOKEN"],
    ["aws", "AWS_KEY"], ["google", "GOOGLE_KEY"], ["slack", "SLACK_TOKEN"],
    ["stripe", "STRIPE_KEY"], ["jwt", "JWT"],
  ]) {
    const r = sanitize("value: " + FAKE[kind] + " end");
    assert.deepEqual(types(r), [type], kind);
    assert.ok(!r.text.includes(FAKE[kind]), kind + " leaked");
  }
});

test("key=value secrets keep the key name, lose the value", () => {
  const r = sanitize('DB_PASSWORD=hunter22\n"api_key": "abc 123 def"\nclient_secret: s3cr3tv4lue');
  assert.equal(r.text, 'DB_PASSWORD=<SECRET_1>\n"api_key": "<SECRET_2>"\nclient_secret: <SECRET_3>');
});

test("query-string token stops at &", () => {
  const r = sanitize("GET /cb?token=abcDEF123456&state=ok");
  assert.equal(r.text, "GET /cb?token=<SECRET_1>&state=ok");
});

test("config that only looks secret-ish is left alone", () => {
  const src = "anthropic.AuthenticationError: invalid x-api-key\nauth_method: oauth2\nmax_tokens=1024\ntoken_type: bearer\npassword_min_length=12\npassword: ${DB_PASS}\nsecret=true\ntoken=*****";
  assert.equal(sanitize(src).text, src);
});

test("password inside a URL (the ffmpeg/RTSP leak)", () => {
  const r = sanitize("[rtsp] opening rtsp://admin:Tr0ub4dor@cam.example.com:554/stream1");
  assert.ok(r.text.includes("rtsp://admin:<URL_PASSWORD_1>@cam.example.com"), r.text);
});

test("Authorization header with a JWT is typed JWT, not generic", () => {
  const r = sanitize("Authorization: Bearer " + FAKE.jwt);
  assert.deepEqual(types(r), ["JWT"]);
});

test("PEM private key block redacted whole", () => {
  const pem = "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\nmore\n-----END OPENSSH PRIVATE KEY-----";
  assert.equal(sanitize("key:\n" + pem + "\nafter").text, "key:\n<PRIVATE_KEY_1>\nafter");
});

test("IPv4: private and public redacted, versions/loopback/masks kept", () => {
  const r = sanitize("peer 192.168.50.23 via 203.0.113.9; bind 127.0.0.1 mask 255.255.255.0; v1.2.3.4; 1.2.3.4.5; 999.1.1.1");
  assert.equal(r.text, "peer <IPV4_1> via <IPV4_2>; bind 127.0.0.1 mask 255.255.255.0; v1.2.3.4; 1.2.3.4.5; 999.1.1.1");
});

test("redactLocal also takes loopback", () => {
  assert.equal(sanitize("127.0.0.1", { redactLocal: true }).text, "<IPV4_1>");
});

test("IPv6 caught; timestamps, C++ scopes and MACs are not IPv6", () => {
  const r = sanitize("addr fe80::1ff:fe23:4567:890a at 12:34:56 in Foo::Bar, mac dc:a6:32:01:02:03");
  assert.equal(r.text, "addr <IPV6_1> at 12:34:56 in Foo::Bar, mac <MAC_1>");
});

test("same value -> same placeholder; distinct values numbered", () => {
  const r = sanitize("a 10.0.0.5 b 10.0.0.6 c 10.0.0.5");
  assert.equal(r.text, "a <IPV4_1> b <IPV4_2> c <IPV4_1>");
  assert.equal(r.counts.IPV4, 3);
});

test("home-directory username is learned and redacted everywhere", () => {
  const r = sanitize("File \"/home/marco/app/run.py\", line 3\nmarco@devbox:~$ whoami\nmarco");
  assert.equal(r.text, "File \"/home/<USER_1>/app/run.py\", line 3\n<USER_1>@<HOST_1>:~$ whoami\n<USER_1>");
});

test("generic usernames are not personal data", () => {
  const src = "/home/pi/x and root@server1:/# and C:\\Users\\Public\\x";
  assert.equal(sanitize(src).text, "/home/pi/x and root@<HOST_1>:/# and C:\\Users\\Public\\x");
});

test("Windows profile path", () => {
  assert.equal(sanitize("C:\\Users\\Giulia\\AppData").text, "C:\\Users\\<USER_1>\\AppData");
});

test("email, but not a git ssh remote", () => {
  const r = sanitize("from alice.smith@example.co.uk, remote git@github.com:org/repo");
  assert.equal(r.text, "from <EMAIL_1>, remote git@github.com:org/repo");
});

test("internal hostnames only; public domains stay", () => {
  const r = sanitize("nas.lan, printer.local, api.corp.internal, github.com");
  assert.equal(r.text, "<HOST_1>, <HOST_2>, <HOST_3>, github.com");
});

test("cards need Luhn; epoch-ms timestamps are not cards", () => {
  const r = sanitize("card 4111 1111 1111 1111 ts 1790244998101 bad 4111 1111 1111 1112");
  assert.equal(r.text, "card <CARD_1> ts 1790244998101 bad 4111 1111 1111 1112");
  assert.ok(_luhn("4111111111111111"));
});

test("IBAN needs mod-97", () => {
  assert.ok(_iban("IT60X0542811101000000123456"));
  assert.ok(!_iban("IT61X0542811101000000123456"));
  const r = sanitize("pay IT60 X054 2811 1010 0000 0123 456 now");
  assert.deepEqual(types(r), ["IBAN"]);
});

test("international phone numbers, not bare numbers", () => {
  const r = sanitize("call +39 347 123 4567 or +1 (202) 555-0143; order 3471234567");
  assert.equal(r.text, "call <PHONE_1> or <PHONE_2>; order 3471234567");
});

test("custom terms never split a bigger match", () => {
  const r = sanitize("mail marco.rossi@example.com; Rossi signed", { custom: ["rossi"] });
  assert.equal(r.text, "mail <EMAIL_1>; <CUSTOM_1> signed");
});

test("custom terms: whole-word, case-insensitive", () => {
  const r = sanitize("Project Apollo on apollo-node; apollox stays", { custom: ["apollo"] });
  assert.equal(r.text, "Project <CUSTOM_1> on <CUSTOM_1>-node; apollox stays");
});

test("categories can be switched off", () => {
  const src = "ip 10.1.2.3 mail a@example.com key " + FAKE.github;
  const r = sanitize(src, { categories: { network: false, personal: false } });
  assert.equal(r.text, "ip 10.1.2.3 mail a@example.com key <GITHUB_TOKEN_1>");
});

test("restore round-trips an AI reply", () => {
  const r = sanitize("ssh marco@10.0.0.7 failed for marco");
  const reply = "Check that <USER_1> can reach <IPV4_1>. Unknown <FOO_9> stays.";
  assert.equal(restore(reply, r.map), "Check that marco can reach 10.0.0.7. Unknown <FOO_9> stays.");
  assert.equal(restore(r.text, r.map), "ssh marco@10.0.0.7 failed for marco");
});

test("already-sanitized text is stable (idempotent)", () => {
  const once = sanitize("pw=hunter22 ip 10.9.8.7 " + FAKE.aws).text;
  assert.equal(sanitize(once).text, once);
});

test("empty and non-string input", () => {
  assert.equal(sanitize("").text, "");
  assert.equal(sanitize(null).text, "");
});

test("1 MB log sanitizes in well under 2 s (no catastrophic regex)", () => {
  const line = "2026-09-24T10:00:00Z INFO conn from 10.0.0.42 user=bob token=abcDEF123456 path=/home/bob/x " + "a".repeat(40) + "\n";
  const big = line.repeat(Math.ceil(1e6 / line.length));
  const t0 = Date.now();
  const r = sanitize(big);
  const ms = Date.now() - t0;
  assert.ok(ms < 2000, "took " + ms + " ms");
  assert.ok(!r.text.includes("10.0.0.42"));
  // pathological inputs for the key=value and IPv6 patterns
  const t1 = Date.now();
  sanitize("password".repeat(20000) + " " + "a:".repeat(50000));
  assert.ok(Date.now() - t1 < 2000, "pathological input too slow");
});

// ---- the shipped page must not be able to phone home ----

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1").replace(/<!--[\s\S]*?-->/g, "");
}

test("page code makes no network calls and declares a locked-down CSP", () => {
  const dir = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const code = ["sanitize.js", "app.js"].map((f) => stripComments(fs.readFileSync(path.join(dir, f), "utf8"))).join("\n");
  for (const bad of ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", "localStorage", "indexedDB", "import("]) {
    assert.ok(!code.includes(bad), "network/storage API in page code: " + bad);
  }
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(stripComments(html).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")), "inline script would break CSP");
  assert.ok(!/src="https?:|href="https?:\/\/(?!toffler\.dev|github\.com)/.test(html), "external resource in page");
});
