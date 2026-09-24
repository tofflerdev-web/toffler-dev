/* TOFFLER Paste Sanitizer — page wiring. All state lives in this tab's memory. */
(function () {
  "use strict";
  const S = window.TofflerSanitize;
  const $ = (id) => document.getElementById(id);
  const input = $("input"), output = $("output"), stats = $("stats"), mapBody = $("map");
  const toggles = { secrets: $("c-secrets"), network: $("c-network"), personal: $("c-personal") };
  let last = { text: "", findings: [], map: {}, counts: {} };

  function opts() {
    return {
      categories: {
        secrets: toggles.secrets.checked,
        network: toggles.network.checked,
        personal: toggles.personal.checked,
      },
      redactLocal: $("c-local").checked,
      custom: $("custom").value.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderOutput(r) {
    output.replaceChildren();
    if (!r.text) { output.append(el("span", "empty", "Redacted text appears here.")); return; }
    const re = /<[A-Z0-9_]+_\d+>/g;
    let pos = 0, m;
    const frag = document.createDocumentFragment();
    while ((m = re.exec(r.text))) {
      if (!Object.prototype.hasOwnProperty.call(r.map, m[0])) continue;
      if (m.index > pos) frag.append(document.createTextNode(r.text.slice(pos, m.index)));
      frag.append(el("mark", null, m[0]));
      pos = m.index + m[0].length;
    }
    frag.append(document.createTextNode(r.text.slice(pos)));
    output.append(frag);
  }

  function renderStats(r) {
    stats.replaceChildren();
    const total = r.findings.length;
    const t = el("span", "total");
    t.append("redactions ", el("b", null, String(total)));
    stats.append(t);
    Object.entries(r.counts).sort((a, b) => b[1] - a[1]).forEach(([type, n]) => {
      const c = el("span", "chip", type.toLowerCase().replace(/_/g, " "));
      c.append(el("b", null, String(n)));
      stats.append(c);
    });
  }

  function renderMap(r) {
    mapBody.replaceChildren();
    const rows = Object.entries(r.map);
    if (!rows.length) {
      const tr = el("tr"); const td = el("td", null, "Nothing redacted yet."); td.colSpan = 2; tr.append(td);
      mapBody.append(tr); return;
    }
    for (const [ph, orig] of rows) {
      const tr = el("tr");
      tr.append(el("td", "ph", ph), el("td", null, orig));
      mapBody.append(tr);
    }
  }

  function run() {
    last = S.sanitize(input.value, opts());
    renderOutput(last);
    renderStats(last);
    renderMap(last);
    runRestore();
  }

  function runRestore() {
    $("restored").value = $("reply").value ? S.restore($("reply").value, last.map) : "";
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, input.value.length > 200000 ? 250 : 60); }

  async function copy(text, btn) {
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = el("textarea"); ta.value = text; document.body.append(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    btn.textContent = "copied"; btn.classList.add("done");
    setTimeout(() => { btn.textContent = label; btn.classList.remove("done"); }, 1400);
  }

  // Sample: fabricated values only; tokens are assembled so no scanner sees one whole.
  function sample() {
    const r = (s, n) => s.repeat(n);
    const jwt = "ey" + "JhbGciOiJIUzI1NiJ9.ey" + "JzdWIiOiJtYXJjbyJ9.c2lnX2RlbW9fb25seV9ub3RfcmVhbA";
    return [
      "$ ssh marco@192.168.1.40",
      "marco@devbox:~$ python3 /home/marco/app/sync.py --verbose",
      "2026-09-24 10:14:02 INFO  opening rtsp://admin:Tr0ub4dor@cam-01.lan:554/stream1",
      "2026-09-24 10:14:02 DEBUG request headers {\"Authorization\": \"Bearer " + jwt + "\"}",
      "2026-09-24 10:14:03 ERROR upload failed for marco.rossi@example.com from 203.0.113.77",
      "Traceback (most recent call last):",
      "  File \"/home/marco/app/sync.py\", line 88, in push",
      "    client = Client(api_key=\"" + "sk-" + "ant-" + "api03-" + "Dm0" + r("kQ7z", 8) + "\")",
      "anthropic.AuthenticationError: invalid x-api-key",
      "",
      "# .env",
      "OPENAI_API_KEY=" + "sk-" + "proj-" + "Z9" + r("tRw3", 8),
      "AWS_ACCESS_KEY_ID=" + "AK" + "IA" + "Q4ZT7MPL2VWN8XRE",
      "db_password = \"correct horse battery staple\"",
      "max_tokens=1024",
      "",
      "wlan1: ether dc:a6:32:4f:1a:2b  inet6 fe80::dea6:32ff:fe4f:1a2b",
      "resolved nas.home.arpa -> 10.0.0.12 (gateway 10.0.0.1)",
      "billing: IBAN IT60 X054 2811 1010 0000 0123 456 · support +39 347 123 4567",
    ].join("\n");
  }

  input.addEventListener("input", schedule);
  $("custom").addEventListener("input", schedule);
  Object.values(toggles).concat($("c-local")).forEach((t) => t.addEventListener("change", run));
  $("reply").addEventListener("input", runRestore);
  $("sample").addEventListener("click", () => { input.value = sample(); $("custom").value = "devbox"; run(); input.focus(); });
  $("clear").addEventListener("click", () => { input.value = ""; $("reply").value = ""; run(); input.focus(); });
  $("copy").addEventListener("click", (e) => copy(last.text, e.currentTarget));
  $("copy-restored").addEventListener("click", (e) => copy($("restored").value, e.currentTarget));
  run();
})();
