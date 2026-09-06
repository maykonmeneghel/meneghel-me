# meneghel.me

A family home and a playable CV, as three independently deployed static sites.

| Site | What it is | Status |
|---|---|---|
| `meneghel.me` | The family: where the surname comes from, the people who built it, what got passed down | copy is placeholder |
| `maykon.meneghel.me` | The CV you can play — eleven chapters, each a working mini-game, then the record | all eleven chapters playable |
| `manu.meneghel.me` | Emanuelle's page | not started |

## The idea

A CV tells you what someone can do. This one lets you try it. The chapters read
bottom-up through the stack — `SILICON → COPPER → STEEL → SIGNAL → SERVICE →
SWARM → MIND → GLASS → SYSTEM` — and every one of them ends with a single
sentence stating what the visitor just learned by playing with it. `FLOW` and `FIELD` then turn the
corner into the present: the 2019 pivot out of the Apple Developer Academy,
Tradx, and the Gaussian Splatting work. The nine chapters
prove range; the last two are what he does on a Tuesday.

Three chapters run on artefacts rather than inventions: `COPPER` renders the
EAGLE file for the AGROM.IO soil probe board, `STEEL` opens on the SolidWorks
render of the assembled sensor and turns its printed parts, and `SYSTEM` closes
by walking one reading through all eight, using the numbers the earlier chapters
established. The last one can be broken on purpose, stage by stage, because the
seams are the argument.

## Running it

```sh
npm install
npm run dev        # maykon.meneghel.me on :4322
npm run dev:root   # meneghel.me on :4321
npm run build      # builds all three
npm test           # topic-filter suite, no test runner needed
```

Node 24 (see `.nvmrc`).

## Layout

```
apps/root      meneghel.me
apps/maykon    maykon.meneghel.me
apps/manu      manu.meneghel.me
packages/ui    design tokens and base stylesheet, shared by all three
infra          Terraform: S3 + CloudFront + Route 53 + GitHub OIDC
assets/raw     source material extracted from Portfolio-2024.pdf (git-ignored)
tools          one-off asset pipelines (EAGLE board, IDF model, STL meshes, BOMs)
docs           what is still needed from Maykon
```

## Testing

The two mini-games with real models behind them keep those models in plain
TypeScript modules, tested separately from the DOM:

- `games/mqtt.ts` implements MQTT topic-filter matching from the OASIS spec.
  `mqtt.test.ts` asserts the spec's own worked examples — including that
  `sport/tennis/player1/#` matches the parent topic `sport/tennis/player1`,
  which is the rule everyone gets wrong.
- `games/swarm.ts` is the cluster model: the traffic curve, the queueing
  latency blow-up near saturation, and the Kubernetes HPA sizing formula.
  `swarm.test.ts` pins the shapes — that latency hangs a cliff rather than
  degrading linearly, that zero replicas is infinite saturation rather than a
  divide-by-zero, and that HPA sizing actually clears the spike.

- `games/gan.ts` follows StockGAN, the generative adversarial network for price
  series Maykon wrote in 2021. Its loss functions are ports, constants included:
  the compound generator loss `l1 * adversarial + l2 * mse`, binary cross-entropy
  under Keras label smoothing, and the polynomial learning-rate decay. The
  generator and critic are stand-ins, and the file says so. `gan.test.ts` pins
  the lesson: the setting that minimises error and the setting that produces
  market-like movement are different settings, so lambda is a decision. It also
  proves the thing label smoothing is for — under smoothing at 0.2 the loss is
  minimised at p = 0.9, so the discriminator is never allowed total certainty.
  The seeded generator warms up four steps before its first draw, because
  straight out of the seed the first value never once fell below a half over two
  thousand consecutive seeds, which had been silently truncating every normal
  draw.

- `games/dbindex.ts` is the query planner's arithmetic over a stated table
  distribution, so every number the panel prints is checkable. `dbindex.test.ts`
  covers the three outcomes that matter: no index means a full scan, the right
  index on a point lookup is ~900x faster, and an index the planner *declines*
  because the query wants 60% of the table buys nothing while still taxing
  every write.

- `data/agrom-board.json` is not written by hand: `tools/extract-board.py`
  generates it from the 2017 EAGLE file for the AGROM.IO soil probe, which
  lives outside this repository. `board.test.ts` guards the extraction — that
  no trace escapes the 70 mm outline, that the totals still come to 754
  segments and 1321 mm of copper, and that the two nets the chapter narrates
  (`+5V` crossing layers seven times, `IN` never crossing) still behave that way.

- `games/board3d.ts` is a small 3D renderer written for one shape: a flat board
  with parts on both faces. `board3d.test.ts` pins the parts that are easy to
  get backwards and impossible to eyeball — that the camera's up and view
  vectors stay orthogonal at every elevation, that a part mounted underneath is
  mirrored the way it is in reality, that back faces are culled by comparing
  world normals rather than screen winding, and that the lamp riding with the
  camera keeps the underside readable without washing out faces turned away.
  Three of those assertions were written after the bug they describe.

- `games/screen.ts` emits the same card as SwiftUI and as Flutter from one
  state. `screen.test.ts` checks both dialects carry every value, that the
  chart appears and disappears in both together, that brackets balance in
  whatever is generated — and the difference the chapter is about: SwiftUI
  declares the gap once on the stack while Flutter needs a spacer between each
  pair of children.
- `games/strategy.ts` is the Tradx chapter: Wilder's RSI, a trending price
  series, and a long-only backtest. `strategy.test.ts` checks the indicator
  against its defining behaviour — pinned at 100 on a series that only rises, 0
  on one that only falls, smoothed rather than windowed — and then sweeps all
  75,429 parameter combinations to pin the claim the panel makes on screen: the
  set that returns most on the tuning half comes 22,949th on the half it never
  saw. An earlier draft of that sentence said "the bottom two thirds", which is
  the 30th percentile and therefore false; the test now guards the figure.
- `games/assembly.ts` rebuilds the AGROM.IO products from their drawings, with
  the printed parts dropped in from their STLs and an explode vector per piece.
  `solid.test.ts` checks the primitives are wound outward, that the mast is the
  drawn lengths stacked with nothing invented between them, that the body has
  the four couplings and six spacers its BOM lists, and that exploding a product
  actually makes it occupy more room — measured, rather than counting how many
  pieces carry an offset, which a three-piece assembly can never satisfy.
- `tools/extract-boms.py` reads the seven bills of material out of their .xlsx
  workbooks — a zip of XML, so stdlib suffices — into 82 line items with
  quantities and the suppliers they were bought from.
- `games/splat.ts` scatters gaussians over a mesh, area-weighted, for the
  chapter that shows the same part as triangles and as a field. `splat.test.ts`
  checks that samples stay inside their triangles, that twenty thousand of them
  average to the centroid — which is what square-rooting the first barycentric
  coordinate buys — and that a face nine times larger receives nine times the
  gaussians.
- `games/system.ts` is the finale's chain: the eight chapters in order, what
  each costs in milliseconds, and which of them fail while still returning a
  number. `system.test.ts` checks every stage stops the trace when broken and
  only when broken, that with two broken the earlier one wins, and that the
  clock only counts stages actually cleared.

Node 24 strips types natively, so all seven run with plain `node` — no runner,
no build step, no dev dependency.

## The one asset that is fetched, not inlined

Everything else on the page is inline. The seven printed parts in chapter 03 are
not: `tools/extract-parts.py` decimates their STLs to about a thousand triangles
each and writes `public/models/agrom-parts.json`, 86 KB, fetched only when the
chapter scrolls into view.

Because it sits in `public/`, the bundler never fingerprints it, and the deploy
marks everything that is not HTML immutable for a year — so the URL carries a
content hash computed at build time. Without it a returning visitor would be
pinned to whatever meshes they downloaded first, permanently.

## The timeline

`docs/` aside, the one piece of hard data in the repo is `apps/maykon/src/content/career.ts`,
transcribed from the LinkedIn export and cross-checked against the 2024 portfolio.
Roles overlap on purpose: the point of the scrubber is that from 2017 onward there
were almost never fewer than two running at the same time, peaking at four in 2023.

## A trap worth writing down

Astro scopes a component's `<style>` by stamping a `data-astro-cid-*` attribute
on the elements in its template. Anything a script creates afterwards — with
`createElement`, or by assigning `innerHTML` — never gets that attribute, so the
component's own CSS silently does not apply to it. It cost an hour twice: once
on the MQTT stream rows, which lost their colours and their strikethrough, and
again on the syntax-highlighted tokens in chapter 08, which rendered grey.

Two ways out, both used here: clone a `<template>` from the markup so the
attribute comes with the node, or write the rule as `.parent :global(.child)`.

## Choices worth explaining

- **Astro, static output.** The site is mostly prose with islands of
  interactivity. Text chapters ship zero JavaScript; each mini-game hydrates
  only when it scrolls into view. Nothing here needs a server, so nothing here
  pays for one.
- **No CSS framework.** The design is bespoke and canvas-heavy; hand-written CSS
  over a token file in `packages/ui` is smaller and clearer than utility classes.
- **Three distributions, not one.** Each subdomain deploys on its own, so
  `manu.meneghel.me` can be built later on a different stack without any risk to
  the others.
- **Mini-games simulate rather than call a backend.** They are always up, cost
  nothing, and cannot embarrass anyone mid-interview. `SIGNAL` is written so the
  simulated broker can be swapped for a real AWS IoT Core connection later.

## Brand

Primary `#FF2D55`, sampled directly out of `Portfolio-2024.pdf` — which happens
to be Apple's system pink, fitting for someone who came up through the Apple
Developer Academy. Deep accent `#FF0635`.

## The CV

`apps/maykon/src/pages/cv.astro` is the CV as a page: one column, real text,
standard section headings, no tables — the shape an applicant tracking system
can parse. It reads the same `career.ts` the site's timeline does, so the CV and
the page can never disagree about a date.

`tools/build-cv.sh` prints that route to `public/cv-maykon-meneghel.pdf` with
headless Chrome. It needs a built site, and the file it writes lands in
`public/`, so the order is build, generate, build again:

```sh
npm run build && ./tools/build-cv.sh && npm run build
```

Two things that had to be got right and are easy to lose:

- **No `letter-spacing` on the headings.** It renders beautifully and extracts
  as `E D U C AT I O N`. Applicant tracking systems find their sections by
  matching the word, so the heading has to survive copy and paste.
- **Print from the built site, not the dev server.** The Astro dev toolbar
  prints as a floating widget in the corner of page one.

Verify a change with `pdftotext -layout` before shipping it — if the text does
not come out clean there, no machine will read it either.
