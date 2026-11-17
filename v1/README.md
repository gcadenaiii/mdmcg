# /v1/: the earlier site, frozen

`site/` is a finished build of the old marketing site, made once on 2026-11-17 so that it works when served from
`/v1/`. It is not rebuilt on each release; the release script copies it as it is.

## How it was made

1. A separate checkout of the archive tag, outside this working tree:
   `git worktree add --detach ../../mdmcg-website-v1-worktree archive-site-v1-2026-11-16`
2. In its `website/` folder: `pnpm install --frozen-lockfile --offline`
3. `git apply` of `v1-base.patch` (from the worktree root), then `pnpm build` (Vite 6.3.5, Node 26.13.0, pnpm 11.3.0).
4. `website/dist/` copied here as `site/`. The worktree was then reset; nothing was committed on the archive.

## What the patch changes (and nothing else)

| File | Change |
|---|---|
| `website/vite.config.ts` | `base: '/v1/'`, so scripts, styles and every image load from `/v1/assets/` |
| `website/src/main.tsx` | router `basename="/v1"`; the four dashboard routes removed (the dashboard has its own build in `platform/`) |
| `website/index.html` | `noindex, nofollow` tag; title gains "(earlier version)"; one small fixed pill, bottom left, "Earlier version of this site. Go to the current site", linking to `/` |

Left alone on purpose: the page content, the in-page links (`#technology` and the rest), the "Explore the Platform"
link (still `/platform/`), the Google Fonts request, and the enquiry form (it still shows its "received" message
without sending anything; changing that is the owner's call).

`SHA256SUMS` lists every file in `site/`.
