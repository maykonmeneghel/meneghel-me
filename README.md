# meneghel.me

A family home and a playable CV, as three independently deployed static sites.

| Site | What it is | Status |
|---|---|---|
| `meneghel.me` | The family: where the surname comes from, the people who built it, what got passed down | copy is placeholder |
| `maykon.meneghel.me` | The CV you can play — nine chapters, each a working mini-game, then the record | chapters 01–07 + timeline playable; 09 to go |
| `manu.meneghel.me` | Emanuelle's page | not started |

## The idea

A CV tells you what someone can do. This one lets you try it. The chapters read
bottom-up through the stack — `SILICON → COPPER → STEEL → SIGNAL → SERVICE →
SWARM → MIND → GLASS → SYSTEM` — and every one of them ends with a single
sentence stating what the visitor just learned by playing with it.

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
tools          one-off asset pipelines (EAGLE board, IDF model, STL meshes)
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

- `games/perceptron.ts` is Rosenblatt's 1958 rule. `perceptron.test.ts` asserts
  both halves of what the chapter claims: separable data always converges, and
  XOR never does. It also pins the UI's "this is not separable" threshold —
  over 400 random starts the separable set converged in at most 53 corrections,
  so warning at 90 cannot fire falsely.

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

Node 24 strips types natively, so all six run with plain `node` — no runner,
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
