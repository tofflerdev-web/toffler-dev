# Paste Sanitizer

Redact secrets and personal data from logs before pasting them into an AI chat,
a ticket or a forum.

- **Use it:** <https://toffler.dev/tools/sanitize/>
- **Source:** <https://github.com/tofflerdev-web/paste-sanitizer>

- **100% client-side.** No server, no analytics, no storage. The page's CSP
  (`connect-src 'none'`) makes the browser refuse any network request.
- **Stable placeholders.** Each distinct value becomes one `<TYPE_n>` token, so
  the redacted log keeps its structure — and an AI reply can be restored locally.
- **Two files.** `sanitize.js` (engine, no dependencies) and `app.js` (page).

## Detects

Anthropic / OpenAI / GitHub / AWS / Google / Slack / Stripe / Telegram tokens,
JWTs, PEM private keys, webhook URLs, `Authorization` headers, passwords in URLs,
`key=value` secrets (env files, JSON, YAML, query strings), IPv4/IPv6, MAC
addresses, internal hostnames (`.lan`, `.local`, `.internal`, `.home.arpa`…),
usernames in home paths / shell prompts / `ssh user@host` (then everywhere else
they appear), emails, international phone numbers, cards (Luhn) and IBANs
(mod-97). Plus any custom terms you add.

Pattern matching is not a guarantee: read the output before you send it.

## Engine API

```js
const { sanitize, restore } = require("./sanitize.js"); // or window.TofflerSanitize
const r = sanitize(text, { categories: { secrets: true, network: true, personal: true },
                           custom: ["project-x"], redactLocal: false });
r.text    // redacted text
r.map     // { "<IPV4_1>": "10.0.0.7", … } — keep in memory only
restore(aiReply, r.map);
```

## Test

```sh
node --test "tools/sanitize/test/*.test.js"
```

## License

MIT — see [LICENSE](LICENSE). © 2026 Toffler.
