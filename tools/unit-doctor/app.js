/* TOFFLER Unit Doctor — page wiring. Nothing leaves this tab. */
(function () {
  "use strict";
  const D = window.TofflerUnitDoctor;
  const $ = (id) => document.getElementById(id);
  const input = $("input");
  let last = null;

  const SEV = { error: "error", warn: "warning", info: "note" };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // `code` spans in rule text -> <code>, everything else as plain text nodes
  function rich(parent, text) {
    text.split("`").forEach((part, i) => {
      if (!part) return;
      parent.append(i % 2 ? el("code", null, part) : document.createTextNode(part));
    });
    return parent;
  }

  function scope() { return document.querySelector('input[name="scope"]:checked').value; }

  function selectLine(n) {
    const lines = input.value.split("\n");
    let start = 0;
    for (let i = 0; i < n - 1 && i < lines.length; i++) start += lines[i].length + 1;
    const end = start + (lines[n - 1] || "").length;
    input.focus();
    input.setSelectionRange(start, end);
    const lh = parseFloat(getComputedStyle(input).lineHeight) || 20;
    input.scrollTop = Math.max(0, (n - 4) * lh);
  }

  function render(r) {
    const hasInput = input.value.trim().length > 0;
    $("grade").textContent = hasInput ? r.grade : "—";
    $("grade").className = "grade g-" + r.grade;
    $("kind").textContent = !hasInput ? "waiting for a unit" : (r.kind ? r.kind.toLowerCase() + " unit" : "no type section") + " · score " + r.score + "/100";

    const counts = $("counts");
    counts.replaceChildren();
    if (hasInput) {
      for (const s of ["error", "warn", "info"]) {
        if (r.counts[s]) counts.append(el("span", "pill " + s, r.counts[s] + " " + SEV[s] + (r.counts[s] > 1 ? "s" : "")));
      }
      if (r.fixable) counts.append(el("span", "pill", r.fixable + " auto-fixable"));
    }

    const list = $("findings");
    list.replaceChildren();
    if (!hasInput) {
      list.append(el("div", "empty", "Paste a unit file, or load the example."));
    } else if (!r.findings.length) {
      list.append(el("div", "empty clean", "No problems found. Nice unit."));
    }
    for (const f of r.findings) {
      const card = el("div", "finding " + f.sev);
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", SEV[f.sev] + " on line " + f.line + ": " + f.title);
      const head = el("div", "fhead");
      head.append(el("span", "sev", SEV[f.sev]), el("span", "ln", "L" + f.line), rich(el("span", "ftitle"), f.title));
      if (f.patch) head.append(el("span", "auto", "auto-fix"));
      card.append(head, rich(el("div", "fdetail"), f.detail));
      if (f.fix) card.append(el("div", "ffix", f.fix));
      const go = () => selectLine(f.line);
      card.addEventListener("click", go);
      card.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } });
      list.append(card);
    }

    const fixed = $("fixed");
    fixed.replaceChildren();
    const copy = $("copy");
    if (!hasInput || !r.fixable) {
      fixed.append(el("span", "hint", hasInput ? "Nothing to auto-fix — see the notes above." : "Auto-fixes appear here."));
      copy.disabled = true;
      $("fixed-label").textContent = "Fixed unit";
      return;
    }
    copy.disabled = false;
    $("fixed-label").textContent = "Fixed unit · " + r.fixable + " fix" + (r.fixable > 1 ? "es" : "") + " applied";
    const before = new Set(input.value.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()));
    for (const line of r.patched.split("\n")) {
      const isNew = line.trim() && !before.has(line.trim());
      const node = el("span", isNew ? "add" : null, line);
      fixed.append(node);
      if (!isNew) fixed.append("\n");
    }
  }

  function run() {
    last = D.analyze(input.value, { user: scope() === "user" });
    render(last);
  }
  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 120); }

  async function copy(text, btn) {
    const label = btn.textContent;
    try { await navigator.clipboard.writeText(text); } catch (_) {
      const ta = el("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    btn.textContent = "copied"; btn.classList.add("done");
    setTimeout(() => { btn.textContent = label; btn.classList.remove("done"); }, 1400);
  }

  const EXAMPLE = [
    "[Unit]",
    "Description=Sensor bridge",
    "After=network-online.target",
    "",
    "[Service]",
    "Type=smple",
    "ExecStart=python3 bridge.py --port 8080 >> ~/bridge.log 2>&1",
    "Environment=MODE=live LABEL=north wing",
    "Restart=always",
    "RestartSec=5",
    "StartLimitIntervalSec=60",
    "StartLimitBurst=3",
    "Usr=pi",
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "",
  ].join("\n");

  input.addEventListener("input", schedule);
  document.querySelectorAll('input[name="scope"]').forEach((r) => r.addEventListener("change", run));
  $("sample").addEventListener("click", () => { input.value = EXAMPLE; run(); input.focus(); input.setSelectionRange(0, 0); });
  $("clear").addEventListener("click", () => { input.value = ""; run(); input.focus(); });
  $("copy").addEventListener("click", (e) => { if (last) copy(last.patched, e.currentTarget); });
  run();
})();
