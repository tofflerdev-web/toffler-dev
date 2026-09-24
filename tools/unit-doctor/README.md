# Unit Doctor

Paste a systemd `.service` or `.timer` file and get the bugs systemd won't tell
you about — explained, with a fixed unit you can copy back.

- **Use it:** <https://toffler.dev/tools/unit-doctor/>
- **Source:** <https://github.com/tofflerdev-web/unit-doctor>

## What it catches

| | systemd itself says |
|---|---|
| Pipes / redirects / `$( )` in `ExecStart=` — passed as literal arguments | nothing |
| Crash loops the start limit can never stop (`RestartSec × burst ≥ interval`) — the unit sits in `activating`, never `failed` | nothing |
| `StartLimitIntervalSec=` in `[Service]` — silently ignored, while the legacy `StartLimitInterval=` *is* accepted there | one journal line |
| Python daemons without `PYTHONUNBUFFERED=1` / `-u` — output stuck in an 8 KB buffer, lost on restart | nothing |
| `WantedBy=multi-user.target` or `User=` in a `--user` unit — never starts / fails | nothing |
| `After=network-online.target` without `Wants=` (and vice versa) | nothing |
| `%Y-%m-%d` in `ExecStart=` — expanded as systemd specifiers | nothing |
| Relative script paths without `WorkingDirectory=`, `~` anywhere | nothing / fatal |
| Typos in keys (case-sensitive) and values (`Restart=allways` → never restarts) | one journal line |
| Keys in the wrong section, deprecated directives, `KillMode=none`, unquoted `Environment=` spaces, two unit types in one file | one journal line |

Each rule was checked against systemd 257, and the test suite runs every
auto-fixed unit through `systemd-analyze verify` (skipped where systemd is absent).
The per-section key table is generated from `systemd.directives(7)` by
`scripts/gen_keys.py`.

## Privacy

100% client-side. The page's CSP sets `connect-src 'none'`, so the browser
refuses any network request — unit files often contain usernames, paths and hosts.

## Engine API

```js
const { analyze } = require("./doctor.js"); // or window.TofflerUnitDoctor
const r = analyze(unitText, { user: false });
r.findings  // [{ sev: "error"|"warn"|"info", id, line, title, detail, fix, patch }]
r.grade     // A B C D F
r.patched   // the unit with every safe auto-fix applied
```

## Test

```sh
node --test "tools/unit-doctor/test/*.test.js"
```

## License

MIT — see [LICENSE](LICENSE). © 2026 Toffler.
