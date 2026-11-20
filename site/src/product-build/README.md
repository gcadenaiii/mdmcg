# Product Build page

The internal program workspace at `/product-build/` (menu: Research, Product Build).

## How it is put together

| File | What it holds |
|---|---|
| `seed/program.js`, `budget.js`, `design.js`, `quality.js`, `security.js`, `tooling.js` | The program's own data: schedule, roles, budget lines, scenarios, requirements, risks, tests, gates, decisions. Internal. |
| `../data/product-build/tools.json`, `parts.json`, `standards.json` | Web research of 2026-11-19, each record with its source page. Internal. |
| `seed/index.js` | Gathers the above into one object. Read only by the build and the tests. |
| `calc.js` | Every calculation, as pure functions. Public code, no figures. |
| `crypto.js` | Locks the data at build, opens it in the browser. |
| `views.js`, `app.js` | Draw the sections and handle changes. Public code, no figures. |
| `../pages/product-build/index.astro` | The page shell with the access code field. |
| `../pages/product-build/payload.json.ts` | Writes the encrypted data file at build. |
| `../styles/product-build.css` | Styles, on the site's tokens. |
| `../../tests/product-build.test.mjs` | Tests. |

**Rule that must not be broken:** nothing under `seed/` or `data/product-build/` may be imported by `app.js`, `views.js`, `calc.js`, `crypto.js` or the page. Those files are sent to every visitor. A test checks this, and another searches the built site for internal text.

## Access

The data is encrypted with AES-256-GCM. The key comes from the access code through PBKDF2-SHA-256 (600,000 rounds).
The code is read at build from `PRODUCT_BUILD_CODE` in `site/.env`, which is not in version control.

- No code set: a release holds no internal data and the page says it is not open.
- Code shorter than 12 characters: the build stops.
- Development server with no code set: the fixed code `local-preview` is used.

The encrypted file is public, so the protection is as strong as the code. Use a long one.

## Where changes are kept

What a person changes on the page is stored in that person's browser, as a list of changes by record id, apart from the
page's data. A rebuilt page never overwrites it; if the page's data changed under a manual change, the page lists the
difference. "Save my changes to a file" and "Load changes from a file" (Records section) move changes between people.
To make changes permanent for everyone, apply the saved file's values to the files under `seed/` and rebuild.

## Commands (from `website/site/`)

```
node --test tests/                 # tests; the last access test needs a build
pnpm dev                           # http://127.0.0.1:5174/product-build/  code: local-preview
pnpm build
node scripts/check-content.mjs     # must end "11 pages checked, 0 problem(s)."
```

## Company plan (added 2026-11-19)

The company has one product, the wearable heart device (ECG with MCG). Its plan, the funding plan, the company page and the reference pages use the same encrypted data file, the same access code and the same store of changes. The battery plan was removed on 2026-11-20:

| Route | What it is | Code |
|---|---|---|
| `/plan/` | Company Strategy: overview, roadmap, financials, shared operations, decisions | `plan.js`, `plan-views.js`, `plan-viz.js` |
| `/product-build/` | Execution Plan 1: ECG/MCG | same, with `views.js` for its Working sections |
| `/plan/funding/` | Execution Plan 2: funding and partnerships | same, with `plan-sections.js` |
| `/plan/reference/` | Reference and history: parts, tools, standards, security, the record of changes | same |

- `portfolio.js` holds the cross-program calculations (shared capacity, budgets, months, pipeline, readiness) and `derive()`, which works out every figure the pages show from the page data and one person's changes. A change kept in a browser for a record that no longer exists is left out, not shown and not counted. Tests: `tests/company-plan.test.mjs`.
- Data: `seed/company.js`, `seed/funding.js`, and research in `data/product-build/funding.json`.
- The two engineering roles exist once (`seed/program.js`) and are shared by every program. Never copy them into a program.
- The content check must end "14 pages checked, 0 problem(s)."
