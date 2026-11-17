# mdmcg.com: the new site

Static marketing site, built with Astro. Plain HTML and CSS, one small script, no framework in the browser.

## Run it

```
pnpm install
pnpm dev --port 5174      # development server, http://127.0.0.1:5174/
pnpm build                # production build into dist/
pnpm preview              # serves dist/ on port 5174
pnpm check:content        # scans the built pages for ruled-out wording (run after build)
node scripts/render-stills.mjs --install   # re-renders the device stills from the 3D model (dev server must be running)
```

Ports 5173 and 5180 belong to other tools; this site uses 5174.

## Contact address

The "Email us" buttons read the destination from an environment variable at build time:

```
SITE_CONTACT_EMAIL=someone@example.org
```

Copy `.env.example` to `.env` (ignored by git) and set the real address there, or set the variable in the shell before
`pnpm build`. The address is never written to the HTML in plain text: it is stored scrambled, and the mail link is
assembled by the script at the moment of the click. If the variable is unset (or left at the example value), every
"Email us" button is an ordinary link to `/work-with-us/`.

## Private preview

`src/config.ts` has one flag, `NOINDEX`. While it is `true` every page carries
`<meta name="robots" content="noindex, nofollow">`. Set it to `false` at launch, and change `public/robots.txt` with it.

## Layout

```
src/config.ts        navigation, lab addresses, the four options, the team, the NOINDEX flag
src/layouts/         Base.astro: head, bar, footer, script
src/pages/           one file per address: / device science reading heart-twin sensors evidence team work-with-us 404
src/components/      Pic (image pipeline), Stage (sticky stage), Bars, Marks, Traces, Averaging, SizeCompare, ...
src/styles/site.css  the design system, ported from the approved mock-up
src/styles/pages.css components added for the inner pages
src/scripts/site.js  bar, phone menu, email buttons, scroll reveals, sticky stages, and the loader for the live 3D device
src/three/           the live 3D device (three.js, loaded after first paint on the home page only): device.js builds any
                     option from specs.json, studio.js lights and draws it, stage.js ties it to the scroll, shots.js holds
                     the camera positions, stills.js draws the still pictures from the same model
src/assets/          image masters (Astro makes AVIF and WebP at several widths) and team photos
src/data/traces.json the two trace shapes drawn on the site, exported from the research tool
scripts/             check-content.mjs, render-stills.mjs (device stills from the 3D model), shots-3d.mjs (review
                     screenshots of the live stage), and two Playwright snippets used to take the page screenshots
```

Fonts (Hind 300, 400, 500 and IBM Plex Mono 400, Latin subset) are served from the site itself.

Addresses that are linked but not part of this build: `/lab/` (the research tools) and `/v1/` (the earlier site).
The site must never create a page or a public folder named `lab`, `v1`, `platform`, `assets` or `api`.

## Facts

Every number on the site comes from the facts sheet in the research folder (`reports/SYNC_FACTS_2026-11-16.md`).
Change a number there before changing it here.

## The live 3D device

The home page's stage shows a live model of option 1 where the machine can run it: motion allowed, a window wider than
900 px, no data saving, at least 4 GB of memory and 4 cores where the browser reports them, and WebGL 2 on real graphics
hardware. Everywhere else, and if the first second runs slowly, the still pictures stay exactly as they are.

- `src/three/specs.json` is a copy of the four options' sizes, sensor places, ring colours and cells from the research
  tool's design data. The site never reads the research folder at build time; copy the values again when the design changes.
- The model draws only parts the design names. The wings and the small top tab each carry an electrode, and the four gold
  pads at the head end of the lid are the charging contacts.
- `HERO_AT_REST` in `src/three/stage.js` chooses what the first scene shows while nothing moves: `'picture'` (the hero
  picture, with the model taking over on scroll or drag) or `'model'` (the live model from the start).
- The chest and field scenes keep their still pictures; the canvas fades out over them.
- `node scripts/render-stills.mjs` needs the dev server on port 5174 and the installed Edge browser. Without `--install`
  it only writes PNG files to `.stills/`.
