#!/usr/bin/env python3
"""Generate the per-section directive table for Unit Doctor from systemd.directives(7).

    MANWIDTH=200 man systemd.directives > directives.txt
    python3 scripts/gen_keys.py directives.txt > keys.json

Only the "UNIT DIRECTIVES" block is read. A directive belongs to a section when
the man page that documents it is one of that section's pages below.
"""
import json
import re
import sys

INSTALL = {"Alias", "WantedBy", "RequiredBy", "UpheldBy", "Also", "DefaultInstance"}
EXEC_LIKE = {"systemd.exec", "systemd.kill", "systemd.resource-control"}
SECTIONS = {
    "Unit": {"systemd.unit"},
    "Service": {"systemd.service"} | EXEC_LIKE,
    "Socket": {"systemd.socket"} | EXEC_LIKE,
    "Timer": {"systemd.timer"},
    "Path": {"systemd.path"},
}


def main(path):
    text = open(path, encoding="utf-8", errors="replace").read()
    start = text.index("UNIT DIRECTIVES")
    end = text.index("\n", text.index("DIRECTIVES", start + 20))  # next heading
    block = text[start:end]
    pages = {}
    current = None
    for line in block.splitlines():
        m = re.match(r"^ {7}([A-Z][A-Za-z0-9]*)=\s*$", line)
        if m:
            current = m.group(1)
            pages.setdefault(current, set())
            continue
        if current:
            for p in re.findall(r"(systemd\.[a-z-]+)\(5\)", line):
                pages[current].add(p)
    out = {sec: sorted(k for k, ps in pages.items() if ps & want) for sec, want in SECTIONS.items()}
    out["Unit"] = [k for k in out["Unit"] if k not in INSTALL]
    out["Install"] = sorted(INSTALL)
    systemd = re.search(r"systemd (\d+)", text)
    out["_source"] = "systemd.directives(7)" + (" v" + systemd.group(1) if systemd else "")
    json.dump(out, sys.stdout, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1])
