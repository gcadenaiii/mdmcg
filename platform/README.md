# /platform/: the motion dashboard, on its own

`site/` is a second build of the old app that contains only the dashboard pages. It exists so the dashboard keeps
working once the marketing pages at `/` are replaced by the new site (before, both shared one `index.html`).

Made on 2026-11-17 from the same checkout as `v1/` (tag `archive-site-v1-2026-11-16`), with `platform-base.patch`:

| File | Change |
|---|---|
| `website/vite.config.ts` | `base: '/platform/'`, so its files are `/platform/index.html` and `/platform/assets/*` |
| `website/src/main.tsx` | the marketing page route removed; any unknown address redirects to `/platform/` |
| `website/index.html` | `noindex, nofollow` tag; title "mdmcg platform" |

Not touched: the four dashboard pages, `api/client.ts` (still calls `/platform/api/...`), the live view (still opens
`/platform/ws/gateway/<id>`), and every package version.

Why a second build of the old app and not a new small project (the engineering paper's first choice): same source,
same lock file, a ten-line patch, nothing to keep in step. The result is 0.7 MB. A separate project can come later if
the dashboard is ever developed again.

`SHA256SUMS` lists every file in `site/`.
