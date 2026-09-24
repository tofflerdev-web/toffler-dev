/*
 * TOFFLER Paste Sanitizer — detection engine.
 *
 * Redacts secrets, network identifiers and personal data from text before it
 * is pasted into an AI chat, a ticket or a forum. Pure function, no I/O: the
 * same file runs in the browser (window.TofflerSanitize) and under Node
 * (module.exports) so the test suite exercises exactly what ships.
 *
 * Every distinct value gets one stable placeholder (<IPV4_1>, <EMAIL_2>…), so
 * the redacted text keeps its structure and a reply can be restored locally.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TofflerSanitize = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- validators ----------

  function luhn(digits) {
    let sum = 0, alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = digits.charCodeAt(i) - 48;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function ibanValid(raw) {
    const s = raw.replace(/ /g, "").toUpperCase();
    if (s.length < 15 || s.length > 34) return false;
    const moved = s.slice(4) + s.slice(0, 4);
    let rem = 0;
    for (const ch of moved) {
      const v = ch >= "A" ? String(ch.charCodeAt(0) - 55) : ch;
      for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
    }
    return rem === 1;
  }

  function ipv4Valid(v, m, text, start, end, opts) {
    const parts = v.split(".");
    if (parts.some((p) => +p > 255)) return false;
    // part of a longer dotted run (1.2.3.4.5) or a version string (v1.2.3.4)
    if (text[start - 1] === "." || /[vV]/.test(text[start - 1] || "")) return false;
    if (text[end] === "." && /\d/.test(text[end + 1] || "")) return false;
    if (!opts.redactLocal && /^(127\.|0\.0\.0\.0$|255\.)/.test(v)) return false;
    return true;
  }

  function ipv6Valid(v, m, text, start, end, opts) {
    const dbl = v.split("::").length - 1;
    if (dbl > 1) return false;
    const groups = v.split(":").filter((g) => g !== "");
    if (groups.some((g) => g.length > 4)) return false;
    if (dbl === 0 && groups.length !== 8) return false;
    if (dbl === 1 && groups.length > 7) return false;
    if (groups.join("").length < 4) return false; // "a::b", "::1"
    if (!opts.redactLocal && /^::1?$/.test(v)) return false;
    return true;
  }

  // Usernames that identify nobody — redacting them only adds noise.
  const GENERIC_USERS = new Set([
    "root", "admin", "user", "users", "pi", "ubuntu", "debian", "runner",
    "home", "shared", "public", "default", "guest", "www-data", "nobody",
    "all users", "administrator", "ec2-user", "git", "docker",
  ]);

  const VALUE_STOPWORDS = new Set([
    "true", "false", "null", "none", "nil", "undefined", "yes", "no", "on",
    "off", "bearer", "basic", "required", "optional", "string", "str", "int",
    "bool", "boolean", "redacted", "hidden", "masked", "empty", "env",
    "invalid", "missing", "expired", "unknown", "denied", "failed", "error",
  ]);

  // key names that contain a secret-ish word but hold config, not secrets
  const BENIGN_KEY = /(tokens|token_?(type|count|limit|usage|endpoint|url)|_?(count|type|limit|len|length|ttl|expiry|expires?(_in|_at)?|url|uri|file|path|dir|env|name|id|enabled|required|policy|mode|header|field|prompt|min|max|method|scheme|provider|level|status|error|exception|failed|failure|warning))$/i;

  function secretValueValid(v, name) {
    if (!v || v.length < 3) return false;
    if (VALUE_STOPWORDS.has(v.toLowerCase())) return false;
    if (/^(\$\{|\$[A-Z_]|%\w+%|\{\{|<[A-Z0-9_]+_\d+>$)/.test(v)) return false; // env refs, templates, our own placeholders
    if (/^[*x•.#-]+$/i.test(v)) return false; // already masked
    if (name && BENIGN_KEY.test(name)) return false;
    return true;
  }

  // ---------- rules (array order = priority on overlap) ----------
  //
  // groups: which capture group is the sensitive part. `i` may be a list of
  // alternatives; the first group that participated in the match is used.

  const KEYWORDS = "passw(?:or)?d|passwd|pwd|pass(?:phrase)?|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|auth(?:[_-]?key)?|credentials?|session[_-]?id|cookie";

  const RULES = [
    // --- secrets ---
    { type: "PRIVATE_KEY", cat: "secrets",
      re: /-----BEGIN[A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z0-9 ]*PRIVATE KEY-----/g },
    { type: "URL_PASSWORD", cat: "secrets",
      re: /(?<![a-z0-9+.-])[a-z][a-z0-9+.-]{0,31}:\/\/[^\s:\/@]{1,256}:([^\s@\/]+)@/gi, groups: [{ i: 1 }] },
    { type: "ANTHROPIC_KEY", cat: "secrets", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
    { type: "OPENAI_KEY", cat: "secrets",
      re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g,
      validate: (v) => /\d/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v.slice(3)) },
    { type: "GITHUB_TOKEN", cat: "secrets",
      re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/g },
    { type: "AWS_KEY", cat: "secrets", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
    { type: "GOOGLE_KEY", cat: "secrets", re: /\bAIza[0-9A-Za-z_-]{35}/g },
    { type: "SLACK_TOKEN", cat: "secrets", re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g },
    { type: "STRIPE_KEY", cat: "secrets", re: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
    { type: "TELEGRAM_TOKEN", cat: "secrets", re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/g },
    { type: "WEBHOOK", cat: "secrets",
      re: /https:\/\/(?:hooks\.slack\.com\/services|(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks)\/[A-Za-z0-9_\/-]+/g },
    { type: "JWT", cat: "secrets",
      re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
    { type: "AUTH_HEADER", cat: "secrets",
      re: /\b(?:Proxy-)?Authorization[ \t]*:[ \t]*(?:Bearer|Basic|Token|Digest|Bot)[ \t]+([^\s"']+)/gi,
      groups: [{ i: 1 }] },
    { type: "SECRET", cat: "secrets",
      re: new RegExp("(?<![A-Za-z0-9_.-])([\"']?)([A-Za-z0-9_.-]{0,40}?(?:" + KEYWORDS + ")[A-Za-z0-9_.-]{0,40})\\1[ \\t]*[:=][ \\t]*" +
        "(?:\"([^\"\\n]*)\"|'([^'\\n]*)'|([^\\s\"'`,;{}()<>&]+))", "gi"),
      groups: [{ i: [3, 4, 5] }],
      validate: (v, m) => secretValueValid(v, m[2]) },
    { type: "BEARER", cat: "secrets", re: /\bBearer[ \t]+([A-Za-z0-9._~+\/=-]{12,})/g, groups: [{ i: 1 }] },

    // --- personal ---
    { type: "EMAIL", cat: "personal",
      re: /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g,
      validate: (v) => !/^git@/i.test(v) },
    { type: "PROMPT", cat: "personal", // shell prompt: user@host:~$
      re: /(?:^|[\s\[(])([a-z_][a-z0-9_-]{0,31})@([A-Za-z0-9][A-Za-z0-9-]{0,62})(?=:[~\/])/gm,
      groups: [{ i: 1, type: "USER" }, { i: 2, type: "HOST", cat: "network" }] },
    { type: "USER", cat: "personal", // ssh marco@10.0.0.7, scp -P 22 f marco@nas:
      re: /\b(?:ssh|scp|sftp|rsync|mosh)\b[^\n@]{0,200}?(?<![\w.-])([a-z_][a-z0-9_.-]{0,31})@(?=[\w\[])/g,
      groups: [{ i: 1 }] },
    { type: "USER", cat: "personal",
      re: /(?:\/home\/|\/Users\/|\/var\/home\/|[A-Za-z]:\\+Users\\+)([^\/\\\s:"'`]+)/g,
      groups: [{ i: 1 }] },

    // --- network ---
    { type: "MAC", cat: "network",
      re: /\b[0-9A-Fa-f]{2}([:-])[0-9A-Fa-f]{2}(?:\1[0-9A-Fa-f]{2}){4}\b/g,
      validate: (v) => !/^(00[:-]){5}00$|^(ff[:-]){5}ff$/i.test(v) },
    { type: "IPV4", cat: "network", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, validate: ipv4Valid },
    { type: "IPV6", cat: "network",
      re: /(?<![\w:.])(?=[0-9A-Fa-f:]{0,39}:[0-9A-Fa-f]{0,4}:)[0-9A-Fa-f:]{2,39}(?![\w:])/g,
      validate: ipv6Valid },
    { type: "HOST", cat: "network",
      re: /(?<![A-Za-z0-9.-])(?:[A-Za-z0-9-]+\.)+(?:local|lan|internal|intranet|corp|localdomain|home\.arpa)\b/gi },

    // --- personal, number-shaped (last: the most false-positive-prone) ---
    { type: "CARD", cat: "personal", re: /\b[2-6]\d{3}(?:[ -]?\d){9,15}\b/g,
      validate: (v) => { const d = v.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && !/^(\d)\1+$/.test(d) && luhn(d); } },
    { type: "IBAN", cat: "personal",
      re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g, validate: ibanValid },
    { type: "PHONE", cat: "personal",
      re: /(?<![\w+])\+\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}(?:[ .-]?\d{2,4}){1,4}\b/g,
      validate: (v) => { const n = v.replace(/\D/g, "").length; return n >= 8 && n <= 15; } },
  ];

  const CATEGORIES = ["secrets", "network", "personal"];

  // Types whose values are hunted down everywhere else once learned
  // (a username found in /home/<user>/ also appears in prompts and prose).
  const LEARNED = { USER: "personal", HOST: "network" };

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function defaults(opts) {
    const o = Object.assign({ redactLocal: false, custom: [] }, opts || {});
    o.categories = Object.assign({ secrets: true, network: true, personal: true }, (opts || {}).categories);
    return o;
  }

  function collect(text, o) {
    const cands = [];
    let prio = 0;

    const custom = (o.custom || []).map((t) => String(t).trim()).filter((t) => t.length >= 2);
    for (const term of custom) {
      const re = new RegExp("(?<![A-Za-z0-9_])" + escapeRe(term) + "(?![A-Za-z0-9_])", "gi");
      for (const m of text.matchAll(re)) {
        // lowest priority: a term inside a bigger match (an email) is covered by it
        cands.push({ start: m.index, end: m.index + m[0].length, type: "CUSTOM", cat: "custom", value: m[0], prio: RULES.length + 2 });
      }
    }

    for (const rule of RULES) {
      const p = prio++;
      const groups = rule.groups || [{ i: 0 }];
      const flags = rule.re.flags.includes("d") ? rule.re.flags : rule.re.flags + "d";
      const re = new RegExp(rule.re.source, flags);
      for (const m of text.matchAll(re)) {
        for (const g of groups) {
          const cat = g.cat || rule.cat;
          if (!o.categories[cat]) continue;
          const idx = [].concat(g.i).find((i) => m[i] !== undefined);
          if (idx === undefined) continue;
          const [start, end] = m.indices[idx];
          const value = text.slice(start, end);
          if (!value) continue;
          if (rule.validate && !rule.validate(value, m, text, start, end, o)) continue;
          const type = g.type || rule.type;
          if (type === "USER" && GENERIC_USERS.has(value.toLowerCase())) continue;
          cands.push({ start, end, type, cat, value, prio: p });
        }
      }
    }

    // learned values: every other bare occurrence of a found username / host
    const seen = new Set();
    for (const c of cands.slice()) {
      if (!LEARNED[c.type] || c.value.length < 3) continue;
      const key = c.type + "\0" + c.value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const re = new RegExp("(?<![A-Za-z0-9_-])" + escapeRe(c.value) + "(?![A-Za-z0-9_-])", "gi");
      for (const m of text.matchAll(re)) {
        cands.push({ start: m.index, end: m.index + m[0].length, type: c.type, cat: c.cat, value: m[0], prio });
      }
    }
    return cands;
  }

  function resolve(cands, len) {
    cands.sort((a, b) => a.prio - b.prio || (b.end - b.start) - (a.end - a.start) || a.start - b.start);
    const taken = new Uint8Array(len);
    const out = [];
    for (const c of cands) {
      let free = true;
      for (let i = c.start; i < c.end; i++) if (taken[i]) { free = false; break; }
      if (!free) continue;
      taken.fill(1, c.start, c.end);
      out.push(c);
    }
    return out.sort((a, b) => a.start - b.start);
  }

  /**
   * sanitize(text, opts) -> { text, findings, map, counts }
   *   opts.categories  { secrets, network, personal } booleans (default all on)
   *   opts.custom      extra literal terms to redact (names, projects, hosts)
   *   opts.redactLocal also redact 127.x / 0.0.0.0 / ::1 (default false)
   * map is placeholder -> original, kept by the caller in memory only.
   */
  function sanitize(text, opts) {
    text = String(text == null ? "" : text);
    const o = defaults(opts);
    const hits = resolve(collect(text, o), text.length);

    const byValue = new Map();
    const perType = {};
    const map = {};
    const counts = {};
    let out = "", pos = 0;
    for (const h of hits) {
      const key = h.value.toLowerCase();
      let ph = byValue.get(key);
      if (!ph) {
        perType[h.type] = (perType[h.type] || 0) + 1;
        ph = "<" + h.type + "_" + perType[h.type] + ">";
        byValue.set(key, ph);
        map[ph] = h.value;
      }
      h.placeholder = ph;
      counts[h.type] = (counts[h.type] || 0) + 1;
      out += text.slice(pos, h.start) + ph;
      pos = h.end;
    }
    out += text.slice(pos);
    return { text: out, findings: hits, map, counts };
  }

  /** restore(text, map): put the originals back into (e.g.) an AI reply. */
  function restore(text, map) {
    return String(text).replace(/<[A-Z0-9_]+_\d+>/g, (ph) => (Object.prototype.hasOwnProperty.call(map, ph) ? map[ph] : ph));
  }

  return { sanitize, restore, CATEGORIES, RULES, _luhn: luhn, _iban: ibanValid };
});
